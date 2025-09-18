/**
 * Основная логика приложения поиска банков по БИК
 */

class BankSearchApp {
    constructor() {
        this.apiClient = new DaDataAPI();
        this.debounceTimer = null;
        this.currentQuery = '';
        this.selectedBank = null;
        this.selectedIndex = -1;
        this.suggestions = [];
        
        // DOM элементы
        this.elements = {
            input: null,
            suggestionsContainer: null,
            suggestionsList: null,
            loadingIndicator: null,
            errorMessage: null,
            bankDetails: null,
            bankDetailsContent: null,
            emptyState: null
        };
        
        // Настройки
        this.settings = {
            debounceDelay: 400,
            minQueryLength: 3,
            maxSuggestions: 10,
            showLoadingDelay: 200
        };
        
        // Состояние
        this.state = {
            isLoading: false,
            hasError: false,
            isSuggestionsVisible: false,
            isBankDetailsVisible: false
        };
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
            this.bindElements();
            this.bindEvents();
            this.setupValidation();
            this.setupKeyboardNavigation();
            
            // Проверяем доступность API
            const isApiAvailable = await this.apiClient.checkAvailability();
            if (!isApiAvailable) {
                this.showError('API сервиса DaData.ru недоступен');
            }
            
            console.log('Bank Search App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Ошибка инициализации приложения');
        }
    }

    /**
     * Привязка DOM элементов
     */
    bindElements() {
        this.elements.input = document.getElementById('bic-input');
        this.elements.suggestionsContainer = document.getElementById('suggestions-container');
        this.elements.suggestionsList = document.getElementById('suggestions-list');
        this.elements.loadingIndicator = document.getElementById('loading-indicator');
        this.elements.errorMessage = document.getElementById('error-message');
        this.elements.bankDetails = document.getElementById('bank-details');
        this.elements.bankDetailsContent = document.getElementById('bank-details-content');
        this.elements.emptyState = document.getElementById('empty-state');

        if (!this.elements.input) {
            throw new Error('Required DOM elements not found');
        }
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        // События ввода
        this.elements.input.addEventListener('input', (e) => {
            this.handleInputChange(e.target.value);
        });

        this.elements.input.addEventListener('focus', () => {
            if (this.suggestions.length > 0) {
                this.showSuggestions();
            }
        });

        this.elements.input.addEventListener('blur', (e) => {
            // Задержка для обработки клика по подсказке
            setTimeout(() => {
                this.hideSuggestions();
            }, 200);
        });

        // События клавиатуры
        this.elements.input.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Клик вне поля ввода
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-container')) {
                this.hideSuggestions();
            }
        });

        // Изменение размера окна
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));
    }

    /**
     * Настройка валидации
     */
    setupValidation() {
        this.elements.input.addEventListener('input', (e) => {
            const value = e.target.value;
            const isValid = Utils.validateBIC(value) || value.length === 0;
            
            this.elements.input.classList.toggle('invalid', !isValid && value.length > 0);
            
            if (!isValid && value.length > 0) {
                this.showInputError('БИК должен состоять из 9 цифр');
            } else {
                this.hideInputError();
            }
        });
    }

    /**
     * Настройка навигации с клавиатуры
     */
    setupKeyboardNavigation() {
        // Дополнительная настройка будет в handleKeyDown
    }

    /**
     * Обработка изменения ввода
     * @param {string} query - Поисковый запрос
     */
    handleInputChange(query) {
        this.currentQuery = query.trim();
        
        // Очищаем предыдущий таймер
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Скрываем ошибки и детали банка
        this.hideError();
        this.hideBankDetails();
        this.hideEmptyState();

        if (this.currentQuery.length === 0) {
            this.hideSuggestions();
            this.showEmptyState();
            return;
        }

        if (this.currentQuery.length < this.settings.minQueryLength) {
            this.hideSuggestions();
            return;
        }

        // Debounced поиск
        this.debounceTimer = setTimeout(() => {
            this.performSearch(this.currentQuery);
        }, this.settings.debounceDelay);
    }

    /**
     * Выполнение поиска
     * @param {string} query - Поисковый запрос
     */
    async performSearch(query) {
        try {
            this.setLoadingState(true);
            this.selectedIndex = -1;

            const result = await this.apiClient.searchBank(query, {
                count: this.settings.maxSuggestions,
                status: ['ACTIVE', 'LIQUIDATING', 'LIQUIDATED']
            });

            this.suggestions = result.suggestions || [];
            this.displaySuggestions();

        } catch (error) {
            console.error('Search failed:', error);
            const errorInfo = this.apiClient.getErrorInfo(error);
            this.showError(errorInfo.message);
            this.hideSuggestions();
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Отображение подсказок
     */
    displaySuggestions() {
        if (this.suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.clearSuggestions();
        
        this.suggestions.forEach((suggestion, index) => {
            const suggestionElement = this.createSuggestionElement(suggestion, index);
            this.elements.suggestionsList.appendChild(suggestionElement);
        });

        this.showSuggestions();
    }

    /**
     * Создание элемента подсказки
     * @param {Object} suggestion - Данные подсказки
     * @param {number} index - Индекс подсказки
     * @returns {HTMLElement} - Элемент подсказки
     */
    createSuggestionElement(suggestion, index) {
        const formattedData = Utils.formatBankData(suggestion);
        if (!formattedData) return null;

        const item = Utils.createElement('div', 'suggestion-item');
        item.setAttribute('data-index', index);
        item.setAttribute('tabindex', '0');

        // Иконка банка
        const icon = Utils.createElement('div', 'suggestion-item__icon');
        icon.textContent = Utils.getBankInitials(formattedData.name);

        // Контент
        const content = Utils.createElement('div', 'suggestion-item__content');
        
        const name = Utils.createElement('div', 'suggestion-item__name');
        name.textContent = formattedData.name;
        
        const bic = Utils.createElement('div', 'suggestion-item__bic');
        bic.textContent = `БИК: ${formattedData.bic}`;
        
        const status = Utils.createElement('div', `suggestion-item__status suggestion-item__status--${Utils.getStatusClass(formattedData.status)}`);
        status.textContent = Utils.getStatusText(formattedData.status);

        content.appendChild(name);
        content.appendChild(bic);
        content.appendChild(status);

        item.appendChild(icon);
        item.appendChild(content);

        // Обработчики событий
        item.addEventListener('click', () => {
            this.selectSuggestion(index);
        });

        item.addEventListener('mouseenter', () => {
            this.selectedIndex = index;
            this.updateSelectedSuggestion();
        });

        return item;
    }

    /**
     * Обновление выбранной подсказки
     */
    updateSelectedSuggestion() {
        const items = this.elements.suggestionsList.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    /**
     * Выбор подсказки
     * @param {number} index - Индекс подсказки
     */
    selectSuggestion(index) {
        if (index < 0 || index >= this.suggestions.length) {
            return;
        }

        const suggestion = this.suggestions[index];
        const formattedData = Utils.formatBankData(suggestion);
        
        if (!formattedData) {
            return;
        }

        this.selectedBank = formattedData;
        this.elements.input.value = formattedData.bic;
        this.hideSuggestions();
        this.displayBankDetails(formattedData);
        
        // Сохраняем в историю поиска
        this.saveToHistory(formattedData);
    }

    /**
     * Отображение детальной информации о банке
     * @param {Object} bankData - Данные банка
     */
    displayBankDetails(bankData) {
        this.clearBankDetails();
        
        // Основная информация
        const bankInfo = this.createBankInfoElement(bankData);
        this.elements.bankDetailsContent.appendChild(bankInfo);

        // Реквизиты
        const requisites = this.createRequisitesElement(bankData);
        this.elements.bankDetailsContent.appendChild(requisites);

        // Адрес
        if (bankData.address) {
            const address = this.createAddressElement(bankData);
            this.elements.bankDetailsContent.appendChild(address);
        }

        this.showBankDetails();
    }

    /**
     * Создание элемента основной информации о банке
     * @param {Object} bankData - Данные банка
     * @returns {HTMLElement} - Элемент информации
     */
    createBankInfoElement(bankData) {
        const section = Utils.createElement('div', 'bank-details__section');
        
        const bankInfo = Utils.createElement('div', 'bank-info');
        
        // Иконка
        const icon = Utils.createElement('div', 'bank-info__icon');
        icon.textContent = Utils.getBankInitials(bankData.name);
        
        // Контент
        const content = Utils.createElement('div', 'bank-info__content');
        
        const name = Utils.createElement('div', 'bank-info__name');
        name.textContent = bankData.name;
        
        const bic = Utils.createElement('div', 'bank-info__bic');
        bic.textContent = `БИК: ${bankData.bic}`;
        
        const status = Utils.createElement('div', `bank-info__status bank-info__status--${Utils.getStatusClass(bankData.status)}`);
        status.textContent = Utils.getStatusText(bankData.status);

        content.appendChild(name);
        content.appendChild(bic);
        content.appendChild(status);

        bankInfo.appendChild(icon);
        bankInfo.appendChild(content);
        section.appendChild(bankInfo);

        return section;
    }

    /**
     * Создание элемента реквизитов
     * @param {Object} bankData - Данные банка
     * @returns {HTMLElement} - Элемент реквизитов
     */
    createRequisitesElement(bankData) {
        const section = Utils.createElement('div', 'bank-details__section');
        
        const title = Utils.createElement('h3', 'bank-details__section-title');
        title.textContent = 'Реквизиты банка';
        section.appendChild(title);

        const grid = Utils.createElement('div', 'bank-details__grid');

        // БИК
        if (bankData.bic) {
            const bicItem = this.createDetailItem('БИК', bankData.bic, true);
            grid.appendChild(bicItem);
        }

        // SWIFT
        if (bankData.swift) {
            const swiftItem = this.createDetailItem('SWIFT', bankData.swift, true);
            grid.appendChild(swiftItem);
        }

        // ИНН
        if (bankData.inn) {
            const innItem = this.createDetailItem('ИНН', Utils.formatINN(bankData.inn), true, Utils.getCleanINN(bankData.inn));
            grid.appendChild(innItem);
        }

        // КПП
        if (bankData.kpp) {
            const kppItem = this.createDetailItem('КПП', Utils.formatKPP(bankData.kpp), true, Utils.getCleanKPP(bankData.kpp));
            grid.appendChild(kppItem);
        }

        // Корреспондентский счет
        if (bankData.correspondentAccount) {
            const corrItem = this.createDetailItem('Корр. счет', Utils.formatAccount(bankData.correspondentAccount), true, Utils.getCleanAccount(bankData.correspondentAccount));
            grid.appendChild(corrItem);
        }

        // Регистрационный номер
        if (bankData.registrationNumber) {
            const regItem = this.createDetailItem('Рег. номер', bankData.registrationNumber);
            grid.appendChild(regItem);
        }

        section.appendChild(grid);
        return section;
    }

    /**
     * Создание элемента адреса
     * @param {Object} bankData - Данные банка
     * @returns {HTMLElement} - Элемент адреса
     */
    createAddressElement(bankData) {
        const section = Utils.createElement('div', 'bank-details__section');
        
        const title = Utils.createElement('h3', 'bank-details__section-title');
        title.textContent = 'Адрес';
        section.appendChild(title);

        const grid = Utils.createElement('div', 'bank-details__grid');

        if (bankData.address) {
            const addressItem = this.createDetailItem('Адрес', bankData.address);
            grid.appendChild(addressItem);
        }

        if (bankData.paymentCity) {
            const cityItem = this.createDetailItem('Город платежей', bankData.paymentCity);
            grid.appendChild(cityItem);
        }

        section.appendChild(grid);
        return section;
    }

    /**
     * Создание элемента детальной информации
     * @param {string} label - Название поля
     * @param {string} value - Значение поля
     * @param {boolean} copyable - Можно ли копировать
     * @param {string} cleanValue - Чистое значение для копирования (без форматирования)
     * @returns {HTMLElement} - Элемент детальной информации
     */
    createDetailItem(label, value, copyable = false, cleanValue = null) {
        const item = Utils.createElement('div', 'bank-detail-item');
        
        const labelEl = Utils.createElement('div', 'bank-detail-item__label');
        labelEl.textContent = label;
        
        const valueEl = Utils.createElement('div', 'bank-detail-item__value');
        valueEl.textContent = value;
        
        if (copyable) {
            valueEl.style.cursor = 'pointer';
            valueEl.title = 'Нажмите для копирования';
            valueEl.addEventListener('click', async () => {
                // Используем чистое значение для копирования, если оно предоставлено
                const valueToCopy = cleanValue !== null ? cleanValue : value;
                const success = await Utils.copyToClipboard(valueToCopy);
                if (success) {
                    this.showCopyNotification(label);
                }
            });
        }

        item.appendChild(labelEl);
        item.appendChild(valueEl);
        return item;
    }

    /**
     * Обработка нажатий клавиш
     * @param {KeyboardEvent} e - Событие клавиатуры
     */
    handleKeyDown(e) {
        if (!this.state.isSuggestionsVisible || this.suggestions.length === 0) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
                this.updateSelectedSuggestion();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelectedSuggestion();
                break;

            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectSuggestion(this.selectedIndex);
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.hideSuggestions();
                this.elements.input.blur();
                break;
        }
    }

    /**
     * Обработка изменения размера окна
     */
    handleResize() {
        // Пересчитываем позицию подсказок если необходимо
        if (this.state.isSuggestionsVisible) {
            this.positionSuggestions();
        }
    }

    /**
     * Позиционирование подсказок
     */
    positionSuggestions() {
        // В данном случае подсказки позиционируются через CSS
        // Но можно добавить логику для динамического позиционирования
    }

    /**
     * Сохранение в историю поиска
     * @param {Object} bankData - Данные банка
     */
    saveToHistory(bankData) {
        const history = Utils.loadFromStorage('bank_search_history', []);
        
        // Добавляем в начало истории
        history.unshift({
            ...bankData,
            timestamp: Date.now()
        });

        // Ограничиваем размер истории
        if (history.length > 20) {
            history.splice(20);
        }

        Utils.saveToStorage('bank_search_history', history);
    }

    /**
     * Показать уведомление о копировании
     * @param {string} field - Название поля
     */
    showCopyNotification(field) {
        // Простое уведомление (можно заменить на toast)
        const notification = Utils.createElement('div', 'copy-notification');
        notification.textContent = `${field} скопирован в буфер обмена`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Методы управления состоянием UI

    setLoadingState(isLoading) {
        this.state.isLoading = isLoading;
        this.elements.loadingIndicator.classList.toggle('active', isLoading);
    }

    showSuggestions() {
        this.state.isSuggestionsVisible = true;
        this.elements.suggestionsContainer.classList.add('active');
        Utils.showElement(this.elements.suggestionsContainer, 'slide-down');
    }

    hideSuggestions() {
        this.state.isSuggestionsVisible = false;
        this.elements.suggestionsContainer.classList.remove('active');
        this.elements.suggestionsContainer.style.display = 'none';
        this.selectedIndex = -1;
    }

    clearSuggestions() {
        this.elements.suggestionsList.innerHTML = '';
    }

    showBankDetails() {
        this.state.isBankDetailsVisible = true;
        this.elements.bankDetails.classList.add('active');
        Utils.showElement(this.elements.bankDetails, 'fade-in');
    }

    hideBankDetails() {
        this.state.isBankDetailsVisible = false;
        this.elements.bankDetails.classList.remove('active');
        this.elements.bankDetails.style.display = 'none';
    }

    clearBankDetails() {
        this.elements.bankDetailsContent.innerHTML = '';
    }

    showEmptyState() {
        this.elements.emptyState.classList.add('active');
        Utils.showElement(this.elements.emptyState, 'fade-in');
    }

    hideEmptyState() {
        this.elements.emptyState.classList.remove('active');
        this.elements.emptyState.style.display = 'none';
    }

    showError(message) {
        this.state.hasError = true;
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.classList.add('active');
    }

    hideError() {
        this.state.hasError = false;
        this.elements.errorMessage.classList.remove('active');
    }

    showInputError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.classList.add('active');
    }

    hideInputError() {
        this.elements.errorMessage.classList.remove('active');
    }

    /**
     * Получение статистики приложения
     * @returns {Object} - Статистика
     */
    getStats() {
        return {
            ...this.state,
            suggestionsCount: this.suggestions.length,
            selectedBank: this.selectedBank ? this.selectedBank.name : null,
            apiStats: this.apiClient.getCacheStats()
        };
    }

    /**
     * Сброс состояния приложения
     */
    reset() {
        this.currentQuery = '';
        this.selectedBank = null;
        this.selectedIndex = -1;
        this.suggestions = [];
        
        this.elements.input.value = '';
        this.hideSuggestions();
        this.hideBankDetails();
        this.hideError();
        this.showEmptyState();
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    const app = new BankSearchApp();
    app.init();
    
    // Делаем приложение доступным глобально для отладки
    window.bankSearchApp = app;
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankSearchApp;
}
