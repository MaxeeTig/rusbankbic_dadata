/**
 * API клиент для работы с DaData.ru
 */

class DaDataAPI {
    constructor(apiKey = null) {
        this.apiKey = apiKey || this.getApiKey();
        this.baseURL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/bank';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${this.apiKey}`
        };
        
        // Кэш для хранения результатов
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
        
        // Очередь запросов для предотвращения дублирования
        this.requestQueue = new Map();
    }

    /**
     * Получение API ключа из переменных окружения или конфигурации
     * @returns {string} - API ключ
     */
    getApiKey() {
        // В реальном приложении API ключ должен быть получен с сервера
        // или из переменных окружения для безопасности
        const apiKey = 'YOUR_DADATA_API_KEY_HERE';
        
        if (apiKey === 'YOUR_DADATA_API_KEY_HERE') {
            console.warn('DaData API key not configured. Please set your API key.');
            return null;
        }
        
        return apiKey;
    }

    /**
     * Поиск банков по запросу
     * @param {string} query - Поисковый запрос (БИК, название, адрес)
     * @param {Object} options - Дополнительные параметры поиска
     * @returns {Promise<Object>} - Результат поиска
     */
    async searchBank(query, options = {}) {
        if (!this.apiKey) {
            throw new Error('API key is not configured');
        }

        if (!query || query.trim().length < 3) {
            return { suggestions: [] };
        }

        // Проверяем кэш
        const cacheKey = this.getCacheKey(query, options);
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        // Проверяем очередь запросов
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }

        const requestBody = {
            query: query.trim(),
            count: options.count || 10,
            status: options.status || ['ACTIVE'],
            type: options.type || ['BANK'],
            locations: options.locations || [],
            locations_boost: options.locations_boost || []
        };

        // Создаем промис для запроса
        const requestPromise = this.makeRequest(requestBody);
        
        // Добавляем в очередь
        this.requestQueue.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            
            // Сохраняем в кэш
            this.saveToCache(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        } finally {
            // Удаляем из очереди
            this.requestQueue.delete(cacheKey);
        }
    }

    /**
     * Поиск банка по БИК
     * @param {string} bic - БИК банка
     * @returns {Promise<Object>} - Результат поиска
     */
    async searchByBIC(bic) {
        if (!Utils.validateBIC(bic)) {
            return { suggestions: [] };
        }

        return this.searchBank(bic, {
            count: 1,
            status: ['ACTIVE', 'LIQUIDATING', 'LIQUIDATED']
        });
    }

    /**
     * Поиск банков по названию
     * @param {string} name - Название банка
     * @param {Object} options - Дополнительные параметры
     * @returns {Promise<Object>} - Результат поиска
     */
    async searchByName(name, options = {}) {
        return this.searchBank(name, {
            count: options.count || 10,
            status: options.status || ['ACTIVE'],
            type: options.type || ['BANK']
        });
    }

    /**
     * Поиск банков по адресу
     * @param {string} address - Адрес банка
     * @param {Object} options - Дополнительные параметры
     * @returns {Promise<Object>} - Результат поиска
     */
    async searchByAddress(address, options = {}) {
        return this.searchBank(address, {
            count: options.count || 10,
            status: options.status || ['ACTIVE'],
            type: options.type || ['BANK']
        });
    }

    /**
     * Выполнение HTTP запроса к API
     * @param {Object} requestBody - Тело запроса
     * @returns {Promise<Object>} - Ответ API
     */
    async makeRequest(requestBody) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: this.defaultHeaders,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            
            // Валидация ответа
            if (!result || typeof result !== 'object') {
                throw new Error('Invalid response format');
            }

            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }

    /**
     * Генерация ключа для кэша
     * @param {string} query - Поисковый запрос
     * @param {Object} options - Параметры поиска
     * @returns {string} - Ключ кэша
     */
    getCacheKey(query, options) {
        const optionsStr = JSON.stringify(options);
        return `${query.toLowerCase()}_${optionsStr}`;
    }

    /**
     * Получение данных из кэша
     * @param {string} key - Ключ кэша
     * @returns {Object|null} - Кэшированные данные или null
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }

        // Проверяем время жизни кэша
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Сохранение данных в кэш
     * @param {string} key - Ключ кэша
     * @param {Object} data - Данные для кэширования
     */
    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });

        // Ограничиваем размер кэша
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Получение статистики кэша
     * @returns {Object} - Статистика кэша
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: 100,
            timeout: this.cacheTimeout
        };
    }

    /**
     * Проверка доступности API
     * @returns {Promise<boolean>} - true если API доступен
     */
    async checkAvailability() {
        try {
            await this.searchBank('044525225', { count: 1 });
            return true;
        } catch (error) {
            console.warn('API availability check failed:', error);
            return false;
        }
    }

    /**
     * Получение информации об ошибке API
     * @param {Error} error - Ошибка
     * @returns {Object} - Информация об ошибке
     */
    getErrorInfo(error) {
        const errorInfo = {
            message: 'Произошла ошибка при поиске банка',
            type: 'unknown',
            canRetry: true
        };

        if (error.message.includes('timeout')) {
            errorInfo.message = 'Превышено время ожидания ответа от сервера';
            errorInfo.type = 'timeout';
        } else if (error.message.includes('401')) {
            errorInfo.message = 'Неверный API ключ';
            errorInfo.type = 'auth';
            errorInfo.canRetry = false;
        } else if (error.message.includes('403')) {
            errorInfo.message = 'Доступ запрещен. Проверьте API ключ и лимиты';
            errorInfo.type = 'forbidden';
            errorInfo.canRetry = false;
        } else if (error.message.includes('429')) {
            errorInfo.message = 'Превышен лимит запросов. Попробуйте позже';
            errorInfo.type = 'rate_limit';
            errorInfo.canRetry = true;
        } else if (error.message.includes('500')) {
            errorInfo.message = 'Временная ошибка сервера';
            errorInfo.type = 'server_error';
        } else if (!navigator.onLine) {
            errorInfo.message = 'Отсутствует подключение к интернету';
            errorInfo.type = 'network';
        }

        return errorInfo;
    }

    /**
     * Настройка параметров по умолчанию
     * @param {Object} defaults - Параметры по умолчанию
     */
    setDefaults(defaults) {
        this.defaultOptions = {
            count: 10,
            status: ['ACTIVE'],
            type: ['BANK'],
            ...defaults
        };
    }

    /**
     * Получение текущих настроек
     * @returns {Object} - Текущие настройки
     */
    getSettings() {
        return {
            apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : null,
            baseURL: this.baseURL,
            cacheTimeout: this.cacheTimeout,
            cacheSize: this.cache.size,
            requestQueueSize: this.requestQueue.size
        };
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DaDataAPI;
}
