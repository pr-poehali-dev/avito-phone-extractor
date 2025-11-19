import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получает историю парсинга из базы данных
    Args: event - dict с httpMethod, queryStringParameters (limit)
          context - объект с request_id
    Returns: HTTP response со списком истории
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
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
        params = event.get('queryStringParameters') or {}
        limit = int(params.get('limit', 50))
        
        dsn = os.environ.get('DATABASE_URL')
        if not dsn:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Database not configured'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        
        cur.execute(
            "SELECT id, url, platform, phone, status, created_at, cost FROM parse_history ORDER BY created_at DESC LIMIT %s",
            (limit,)
        )
        
        rows = cur.fetchall()
        
        history = []
        for row in rows:
            history.append({
                'id': str(row[0]),
                'url': row[1],
                'platform': row[2],
                'phone': row[3],
                'status': row[4],
                'timestamp': row[5].isoformat() if row[5] else None,
                'cost': row[6]
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'history': history}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Database error: {str(e)}'}),
            'isBase64Encoded': False
        }
