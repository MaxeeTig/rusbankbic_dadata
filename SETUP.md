# Инструкция по настройке API ключа DaData.ru

## Получение API ключа

1. Перейдите на сайт [DaData.ru](https://dadata.ru)
2. Зарегистрируйтесь или войдите в аккаунт
3. Перейдите в раздел "API" → "Мои ключи"
4. Создайте новый API ключ или используйте существующий
5. Скопируйте ваш API ключ

## Настройка в приложении

### Способ 1: Прямая замена в коде (для тестирования)

Откройте файл `js/api.js` и найдите строку:
```javascript
const apiKey = 'YOUR_DADATA_API_KEY_HERE';
```

Замените `YOUR_DADATA_API_KEY_HERE` на ваш реальный API ключ:
```javascript
const apiKey = 'ваш_api_ключ_здесь';
```

### Способ 2: Переменная окружения (рекомендуется для продакшена)

Создайте файл `config.js` в корне проекта:
```javascript
// config.js
window.APP_CONFIG = {
    DADATA_API_KEY: 'ваш_api_ключ_здесь'
};
```

Затем подключите его в `index.html` перед другими скриптами:
```html
<script src="config.js"></script>
<script src="js/utils.js"></script>
<script src="js/api.js"></script>
<script src="js/app.js"></script>
```

И обновите метод `getApiKey()` в `js/api.js`:
```javascript
getApiKey() {
    // Сначала проверяем глобальную конфигурацию
    if (window.APP_CONFIG && window.APP_CONFIG.DADATA_API_KEY) {
        return window.APP_CONFIG.DADATA_API_KEY;
    }
    
    // Fallback для разработки
    const apiKey = 'YOUR_DADATA_API_KEY_HERE';
    
    if (apiKey === 'YOUR_DADATA_API_KEY_HERE') {
        console.warn('DaData API key not configured. Please set your API key.');
        return null;
    }
    
    return apiKey;
}
```

### Способ 3: Серверная конфигурация (для продакшена)

Для продакшена рекомендуется получать API ключ с сервера через AJAX запрос:

```javascript
async getApiKey() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        return config.dadataApiKey;
    } catch (error) {
        console.error('Failed to load API key from server:', error);
        return null;
    }
}
```

## Проверка работы

После настройки API ключа:

1. Откройте `index.html` в браузере
2. Введите любой БИК (например: `044525225` для Сбербанка)
3. Если API ключ настроен правильно, вы увидите подсказки
4. Если появится ошибка "API key is not configured", проверьте настройку ключа

## Безопасность

⚠️ **Важно**: Никогда не коммитьте файлы с реальными API ключами в публичные репозитории!

- Добавьте `config.js` в `.gitignore`
- Используйте переменные окружения на сервере
- Ограничьте использование API ключа по IP адресам в настройках DaData.ru

## Лимиты API

DaData.ru предоставляет:
- **Бесплатно**: до 10,000 запросов в день
- **Платно**: больше запросов по тарифным планам

Проверьте текущие лимиты в личном кабинете DaData.ru.
