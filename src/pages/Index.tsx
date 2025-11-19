import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface ParseResult {
  id: string;
  url: string;
  platform: 'avito' | 'rabota';
  phone: string;
  status: 'success' | 'failed';
  timestamp: Date;
  cost: number;
}

const PARSE_API_URL = 'https://functions.poehali.dev/aaec67af-c395-457f-b39e-ebdcbb62240c';
const HISTORY_API_URL = 'https://functions.poehali.dev/1c021a25-7781-4ccb-903b-f167c8dcc2cb';

const Index = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<ParseResult | null>(null);
  const [history, setHistory] = useState<ParseResult[]>([]);
  const [balance, setBalance] = useState(450);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(HISTORY_API_URL);
      const data = await response.json();
      if (data.history) {
        const formattedHistory = data.history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setHistory(formattedHistory);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const handleParse = async () => {
    if (!url.trim()) {
      toast.error('Введите ссылку на объявление');
      return;
    }

    if (!url.includes('avito.ru') && !url.includes('rabota.ru')) {
      toast.error('Поддерживаются только Avito и Работа.ру');
      return;
    }

    setIsLoading(true);
    setCurrentResult(null);

    try {
      const response = await fetch(PARSE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const result: ParseResult = {
          id: Date.now().toString(),
          url: data.url,
          platform: data.platform,
          phone: data.phone,
          status: 'success',
          timestamp: new Date(),
          cost: 15
        };

        setCurrentResult(result);
        setBalance(balance - 15);
        toast.success('Номер успешно извлечён');
        await loadHistory();
      } else {
        const result: ParseResult = {
          id: Date.now().toString(),
          url,
          platform: url.includes('avito.ru') ? 'avito' : 'rabota',
          phone: '',
          status: 'failed',
          timestamp: new Date(),
          cost: 0
        };

        setCurrentResult(result);
        toast.error(data.error || 'Не удалось извлечь номер');
        await loadHistory();
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером');
      console.error('Parse error:', error);
    } finally {
      setIsLoading(false);
      setUrl('');
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (hours > 24) {
      return date.toLocaleDateString('ru-RU');
    } else if (hours > 0) {
      return `${hours} ч. назад`;
    } else {
      return `${minutes} мин. назад`;
    }
  };

  const successRate = Math.round((history.filter(h => h.status === 'success').length / history.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E1A] via-[#1A1F2C] to-[#0A0E1A]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Icon name="Phone" size={40} className="text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-success">
              Parser Pro
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Извлечение контактов из Avito и Работа.ру за секунды
          </p>
        </div>

        <Tabs defaultValue="parse" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="parse" className="gap-2">
              <Icon name="Search" size={16} />
              Парсинг
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Icon name="History" size={16} />
              История
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Icon name="User" size={16} />
              Кабинет
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parse" className="space-y-6 animate-fade-in">
            <Card className="glass-card max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Icon name="Link" size={24} />
                  Введите ссылку
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.avito.ru/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleParse()}
                    disabled={isLoading}
                    className="flex-1 bg-secondary/50 border-primary/20 focus:border-primary transition-colors"
                  />
                  <Button 
                    onClick={handleParse} 
                    disabled={isLoading}
                    className="px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    {isLoading ? (
                      <>
                        <Icon name="Loader2" size={20} className="animate-spin mr-2" />
                        Парсинг...
                      </>
                    ) : (
                      <>
                        <Icon name="Zap" size={20} className="mr-2" />
                        Извлечь
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="gap-1">
                    <Icon name="CheckCircle2" size={14} />
                    Avito
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Icon name="CheckCircle2" size={14} />
                    Работа.ру
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Icon name="Coins" size={14} />
                    15 руб/запрос
                  </Badge>
                </div>

                {isLoading && (
                  <Card className="border-primary/30 animate-pulse-glow bg-gradient-to-r from-primary/10 to-success/10">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Icon name="Loader2" size={24} className="animate-spin text-primary" />
                        <div>
                          <p className="font-medium">Обрабатываем запрос...</p>
                          <p className="text-sm text-muted-foreground">Selenium извлекает номер телефона</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentResult && !isLoading && (
                  <Card className={`border-2 animate-scale-in ${currentResult.status === 'success' ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon 
                              name={currentResult.status === 'success' ? 'CheckCircle2' : 'XCircle'} 
                              size={24} 
                              className={currentResult.status === 'success' ? 'text-success' : 'text-destructive'}
                            />
                            <Badge variant={currentResult.status === 'success' ? 'default' : 'destructive'}>
                              {currentResult.platform === 'avito' ? 'Avito' : 'Работа.ру'}
                            </Badge>
                          </div>
                          {currentResult.status === 'success' ? (
                            <>
                              <p className="text-2xl font-bold text-success">{currentResult.phone}</p>
                              <p className="text-sm text-muted-foreground truncate">{currentResult.url}</p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Номер телефона не найден в объявлении</p>
                          )}
                        </div>
                        {currentResult.status === 'success' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(currentResult.phone);
                              toast.success('Номер скопирован');
                            }}
                          >
                            <Icon name="Copy" size={16} className="mr-2" />
                            Копировать
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/20">
                      <Icon name="Target" size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Успешность</p>
                      <p className="text-2xl font-bold">{successRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-success/20">
                      <Icon name="TrendingUp" size={24} className="text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Извлечено</p>
                      <p className="text-2xl font-bold">{history.filter(h => h.status === 'success').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-accent/20">
                      <Icon name="Wallet" size={24} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Баланс</p>
                      <p className="text-2xl font-bold">{balance} ₽</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="animate-fade-in">
            <Card className="glass-card max-w-5xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Icon name="History" size={24} />
                  История запросов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map((item) => (
                    <Card key={item.id} className={`border ${item.status === 'success' ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'} hover:border-primary/50 transition-colors`}>
                      <CardContent className="pt-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={item.status === 'success' ? 'default' : 'destructive'} className="gap-1">
                                <Icon name={item.platform === 'avito' ? 'ShoppingCart' : 'Briefcase'} size={14} />
                                {item.platform === 'avito' ? 'Avito' : 'Работа.ру'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{formatDate(item.timestamp)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{item.url}</p>
                            {item.status === 'success' && (
                              <p className="text-lg font-semibold text-success">{item.phone}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {item.status === 'success' ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.phone);
                                    toast.success('Номер скопирован');
                                  }}
                                >
                                  <Icon name="Copy" size={16} />
                                </Button>
                                <Badge variant="outline" className="gap-1">
                                  <Icon name="Coins" size={14} />
                                  {item.cost} ₽
                                </Badge>
                              </>
                            ) : (
                              <Badge variant="destructive">
                                <Icon name="XCircle" size={14} className="mr-1" />
                                Ошибка
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="glass-card gradient-border">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Icon name="User" size={24} />
                    Личный кабинет
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                      <p className="text-sm text-muted-foreground mb-2">Текущий баланс</p>
                      <p className="text-4xl font-bold text-primary mb-4">{balance} ₽</p>
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        <Icon name="Plus" size={20} className="mr-2" />
                        Пополнить
                      </Button>
                    </div>

                    <div className="p-6 rounded-lg bg-gradient-to-br from-success/20 to-success/5 border border-success/30">
                      <p className="text-sm text-muted-foreground mb-2">Ваш тариф</p>
                      <p className="text-2xl font-bold text-success mb-1">Стандарт</p>
                      <p className="text-sm text-muted-foreground mb-4">15 ₽ за запрос</p>
                      <Button variant="outline" className="w-full border-success/50 hover:bg-success/10">
                        <Icon name="Crown" size={20} className="mr-2" />
                        Повысить
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Icon name="BarChart3" size={20} />
                      Статистика
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm text-muted-foreground">Всего запросов</p>
                        <p className="text-2xl font-bold">{history.length}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm text-muted-foreground">Успешных</p>
                        <p className="text-2xl font-bold text-success">{history.filter(h => h.status === 'success').length}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm text-muted-foreground">Неудачных</p>
                        <p className="text-2xl font-bold text-destructive">{history.filter(h => h.status === 'failed').length}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-sm text-muted-foreground">Потрачено</p>
                        <p className="text-2xl font-bold">{history.reduce((acc, h) => acc + h.cost, 0)} ₽</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Icon name="CreditCard" size={20} />
                      Доступные тарифы
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-border/50">
                        <CardContent className="pt-6">
                          <div className="text-center space-y-3">
                            <h4 className="font-semibold text-lg">Базовый</h4>
                            <p className="text-3xl font-bold">20 ₽</p>
                            <p className="text-sm text-muted-foreground">за запрос</p>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                              <li>• Без лимитов</li>
                              <li>• Стандартная скорость</li>
                            </ul>
                            <Button variant="outline" className="w-full" disabled>
                              Текущий
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-primary gradient-border">
                        <CardContent className="pt-6">
                          <div className="text-center space-y-3">
                            <Badge className="mb-2">Популярный</Badge>
                            <h4 className="font-semibold text-lg">Стандарт</h4>
                            <p className="text-3xl font-bold text-primary">15 ₽</p>
                            <p className="text-sm text-muted-foreground">за запрос</p>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                              <li>• Без лимитов</li>
                              <li>• Быстрая обработка</li>
                              <li>• Приоритет</li>
                            </ul>
                            <Button className="w-full bg-primary hover:bg-primary/90">
                              Активен
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardContent className="pt-6">
                          <div className="text-center space-y-3">
                            <h4 className="font-semibold text-lg">Премиум</h4>
                            <p className="text-3xl font-bold">10 ₽</p>
                            <p className="text-sm text-muted-foreground">за запрос</p>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                              <li>• Без лимитов</li>
                              <li>• Максимальная скорость</li>
                              <li>• VIP поддержка</li>
                            </ul>
                            <Button variant="outline" className="w-full">
                              Выбрать
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;