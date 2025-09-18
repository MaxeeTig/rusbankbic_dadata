/**
 * Вспомогательные функции для приложения поиска банков
 */

class Utils {
    /**
     * Debounce функция для оптимизации запросов
     * @param {Function} func - Функция для выполнения
     * @param {number} wait - Задержка в миллисекундах
     * @returns {Function} - Debounced функция
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Валидация формата БИК
     * @param {string} bic - БИК для проверки
     * @returns {boolean} - true если БИК валиден
     */
    static validateBIC(bic) {
        if (!bic || typeof bic !== 'string') {
            return false;
        }
        
        // БИК должен состоять из 9 цифр
        const bicRegex = /^\d{9}$/;
        return bicRegex.test(bic.trim());
    }

    /**
     * Форматирование БИК для отображения
     * @param {string} bic - БИК для форматирования
     * @returns {string} - Отформатированный БИК
     */
    static formatBIC(bic) {
        if (!bic) return '';
        
        // Убираем все нецифровые символы
        const cleanBIC = bic.replace(/\D/g, '');
        
        // Возвращаем только первые 9 цифр
        return cleanBIC.substring(0, 9);
    }

    /**
     * Форматирование данных банка для отображения
     * @param {Object} bank - Данные банка от API
     * @returns {Object} - Отформатированные данные
     */
    static formatBankData(bank) {
        if (!bank || !bank.data) {
            return null;
        }

        const data = bank.data;
        
        return {
            name: data.name?.short || data.name?.full || 'Неизвестно',
            fullName: data.name?.full || data.name?.short || 'Неизвестно',
            bic: data.bic || '',
            swift: data.swift || '',
            inn: data.inn || '',
            kpp: data.kpp || '',
            correspondentAccount: data.correspondent_account || '',
            address: data.address?.value || '',
            paymentCity: data.payment_city || '',
            status: data.state?.status || 'UNKNOWN',
            registrationNumber: data.registration_number || '',
            treasuryAccounts: data.treasury_accounts || null,
            opf: data.opf || {}
        };
    }

    /**
     * Получение текста статуса банка
     * @param {string} status - Статус банка
     * @returns {string} - Человекочитаемый статус
     */
    static getStatusText(status) {
        const statusMap = {
            'ACTIVE': 'Действующий',
            'LIQUIDATING': 'Ликвидируется',
            'LIQUIDATED': 'Ликвидирован',
            'UNKNOWN': 'Неизвестно'
        };
        
        return statusMap[status] || 'Неизвестно';
    }

    /**
     * Получение CSS класса для статуса
     * @param {string} status - Статус банка
     * @returns {string} - CSS класс
     */
    static getStatusClass(status) {
        const classMap = {
            'ACTIVE': 'active',
            'LIQUIDATING': 'liquidated',
            'LIQUIDATED': 'liquidated',
            'UNKNOWN': 'unknown'
        };
        
        return classMap[status] || 'unknown';
    }

    /**
     * Создание DOM элемента
     * @param {string} tag - Тег элемента
     * @param {string} className - CSS класс
     * @param {string} content - Содержимое элемента
     * @param {Object} attributes - Атрибуты элемента
     * @returns {HTMLElement} - Созданный элемент
     */
    static createElement(tag, className = '', content = '', attributes = {}) {
        const element = document.createElement(tag);
        
        if (className) {
            element.className = className;
        }
        
        if (content) {
            element.textContent = content;
        }
        
        Object.keys(attributes).forEach(key => {
            element.setAttribute(key, attributes[key]);
        });
        
        return element;
    }

    /**
     * Создание SVG иконки
     * @param {string} iconName - Название иконки
     * @param {number} size - Размер иконки
     * @returns {string} - SVG код иконки
     */
    static createSVGIcon(iconName, size = 24) {
        const icons = {
            search: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
            </svg>`,
            bank: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>`,
            check: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"></polyline>
            </svg>`,
            error: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y1="15"></line>
                <line x1="9" y1="9" x2="15" y1="15"></line>
            </svg>`
        };
        
        return icons[iconName] || icons.error;
    }

    /**
     * Получение первых букв названия банка для иконки
     * @param {string} name - Название банка
     * @returns {string} - Первые буквы
     */
    static getBankInitials(name) {
        if (!name) return 'Б';
        
        const words = name.split(' ').filter(word => word.length > 0);
        
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        
        return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
    }

    /**
     * Форматирование номера счета
     * @param {string} account - Номер счета
     * @returns {string} - Отформатированный номер
     */
    static formatAccount(account) {
        if (!account) return '';
        
        // Убираем все нецифровые символы
        const cleanAccount = account.replace(/\D/g, '');
        
        // Форматируем по 4 цифры с пробелами
        return cleanAccount.replace(/(\d{4})(?=\d)/g, '$1 ');
    }

    /**
     * Получение чистого номера счета без форматирования
     * @param {string} account - Номер счета
     * @returns {string} - Чистый номер счета
     */
    static getCleanAccount(account) {
        if (!account) return '';
        return account.replace(/\D/g, '');
    }

    /**
     * Форматирование ИНН
     * @param {string} inn - ИНН
     * @returns {string} - Отформатированный ИНН
     */
    static formatINN(inn) {
        if (!inn) return '';
        
        const cleanINN = inn.replace(/\D/g, '');
        
        if (cleanINN.length === 10) {
            return cleanINN.replace(/(\d{2})(\d{2})(\d{2})(\d{4})/, '$1 $2 $3 $4');
        } else if (cleanINN.length === 12) {
            return cleanINN.replace(/(\d{2})(\d{2})(\d{2})(\d{3})(\d{3})/, '$1 $2 $3 $4 $5');
        }
        
        return cleanINN;
    }

    /**
     * Получение чистого ИНН без форматирования
     * @param {string} inn - ИНН
     * @returns {string} - Чистый ИНН
     */
    static getCleanINN(inn) {
        if (!inn) return '';
        return inn.replace(/\D/g, '');
    }

    /**
     * Форматирование КПП
     * @param {string} kpp - КПП
     * @returns {string} - Отформатированный КПП
     */
    static formatKPP(kpp) {
        if (!kpp) return '';
        
        const cleanKPP = kpp.replace(/\D/g, '');
        
        if (cleanKPP.length === 9) {
            return cleanKPP.replace(/(\d{4})(\d{2})(\d{3})/, '$1 $2 $3');
        }
        
        return cleanKPP;
    }

    /**
     * Получение чистого КПП без форматирования
     * @param {string} kpp - КПП
     * @returns {string} - Чистый КПП
     */
    static getCleanKPP(kpp) {
        if (!kpp) return '';
        return kpp.replace(/\D/g, '');
    }

    /**
     * Проверка поддержки localStorage
     * @returns {boolean} - true если localStorage поддерживается
     */
    static isLocalStorageSupported() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Сохранение данных в localStorage
     * @param {string} key - Ключ
     * @param {any} data - Данные для сохранения
     * @returns {boolean} - true если сохранение успешно
     */
    static saveToStorage(key, data) {
        if (!this.isLocalStorageSupported()) {
            return false;
        }
        
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
            return false;
        }
    }

    /**
     * Загрузка данных из localStorage
     * @param {string} key - Ключ
     * @param {any} defaultValue - Значение по умолчанию
     * @returns {any} - Загруженные данные или значение по умолчанию
     */
    static loadFromStorage(key, defaultValue = null) {
        if (!this.isLocalStorageSupported()) {
            return defaultValue;
        }
        
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
            return defaultValue;
        }
    }

    /**
     * Очистка данных из localStorage
     * @param {string} key - Ключ
     * @returns {boolean} - true если очистка успешна
     */
    static clearFromStorage(key) {
        if (!this.isLocalStorageSupported()) {
            return false;
        }
        
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('Failed to clear from localStorage:', e);
            return false;
        }
    }

    /**
     * Добавление CSS класса с анимацией
     * @param {HTMLElement} element - Элемент
     * @param {string} className - CSS класс
     * @param {number} duration - Длительность анимации в мс
     */
    static addClassWithAnimation(element, className, duration = 300) {
        if (!element) return;
        
        element.classList.add(className);
        
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    }

    /**
     * Показать элемент с анимацией
     * @param {HTMLElement} element - Элемент
     * @param {string} animationClass - CSS класс анимации
     */
    static showElement(element, animationClass = 'fade-in') {
        if (!element) return;
        
        element.style.display = 'block';
        element.classList.add(animationClass);
        
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, 300);
    }

    /**
     * Скрыть элемент с анимацией
     * @param {HTMLElement} element - Элемент
     * @param {string} animationClass - CSS класс анимации
     */
    static hideElement(element, animationClass = 'fade-out') {
        if (!element) return;
        
        element.classList.add(animationClass);
        
        setTimeout(() => {
            element.style.display = 'none';
            element.classList.remove(animationClass);
        }, 300);
    }

    /**
     * Копирование текста в буфер обмена
     * @param {string} text - Текст для копирования
     * @returns {Promise<boolean>} - true если копирование успешно
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                return success;
            }
        } catch (e) {
            console.warn('Failed to copy to clipboard:', e);
            return false;
        }
    }

    /**
     * Генерация уникального ID
     * @returns {string} - Уникальный ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Проверка на мобильное устройство
     * @returns {boolean} - true если мобильное устройство
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Получение размера экрана
     * @returns {Object} - Объект с размерами экрана
     */
    static getScreenSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: this.isMobile(),
            isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
            isDesktop: window.innerWidth >= 1024
        };
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
