import json
import os
import psycopg2
from typing import Dict, Any
from urllib.parse import urlparse
import re

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Извлекает номер телефона из объявлений Avito и Работа.ру через парсинг HTML
    Args: event - dict с httpMethod, body (url объявления)
          context - объект с request_id, function_name
    Returns: HTTP response с номером телефона или ошибкой
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_str = event.get('body', '{}')
        if not body_str or body_str.strip() == '':
            body_str = '{}'
        body_data = json.loads(body_str)
        url = body_data.get('url', '').strip()
        
        if not url:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'URL обязателен'}),
                'isBase64Encoded': False
            }
        
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()
        
        if 'avito.ru' in domain:
            platform = 'avito'
        elif 'rabota.ru' in domain:
            platform = 'rabota'
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Поддерживаются только Avito и Работа.ру'}),
                'isBase64Encoded': False
            }
        
        phone = extract_phone_from_url(url, platform)
        
        dsn = os.environ.get('DATABASE_URL')
        if dsn:
            conn = psycopg2.connect(dsn)
            cur = conn.cursor()
            
            status = 'success' if phone else 'failed'
            cost = 15 if phone else 0
            
            cur.execute(
                "INSERT INTO parse_history (url, platform, phone, status, cost) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (url, platform, phone or '', status, cost)
            )
            result_id = cur.fetchone()[0]
            
            conn.commit()
            cur.close()
            conn.close()
        
        if phone:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'phone': phone,
                    'platform': platform,
                    'url': url
                }),
                'isBase64Encoded': False
            }
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Номер телефона не найден в объявлении'
                }),
                'isBase64Encoded': False
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Ошибка парсинга: {str(e)}'}),
            'isBase64Encoded': False
        }


def extract_phone_from_url(url: str, platform: str) -> str:
    '''Извлекает номер телефона из URL объявления через HTTP запрос'''
    import urllib.request
    from urllib.error import URLError, HTTPError
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        req = urllib.request.Request(url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
        
        phone_patterns = [
            r'\+7\s?\(?(\d{3})\)?\s?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})',
            r'8\s?\(?(\d{3})\)?\s?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})',
            r'\+7(\d{10})',
            r'8(\d{10})',
        ]
        
        for pattern in phone_patterns:
            matches = re.findall(pattern, html)
            if matches:
                if isinstance(matches[0], tuple):
                    digits = ''.join(matches[0])
                    if len(digits) == 10:
                        return f'+7 ({digits[:3]}) {digits[3:6]}-{digits[6:8]}-{digits[8:]}'
                else:
                    digits = matches[0]
                    if len(digits) == 10:
                        return f'+7 ({digits[:3]}) {digits[3:6]}-{digits[6:8]}-{digits[8:]}'
        
        return ''
        
    except (URLError, HTTPError, TimeoutError):
        return ''