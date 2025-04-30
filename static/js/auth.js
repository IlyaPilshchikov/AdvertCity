document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Обработчик для авторизации
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    password 
                }),
                credentials: 'include' // Поддержка сессий
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Вход выполнен успешно!') {
                    updateAuthLinks(true, data.redirect === '/admin' ? 'admin' : 'user');
                    window.location.href = data.redirect; // Перенаправление на основе роли
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Ошибка при подключении к серверу:', error);
                alert('Ошибка при подключении к серверу.');
            });
        });
    }

    // Обработчик для регистрации
    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const role = 'user'; // Роль по умолчанию

            fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, role }),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Регистрация выполнена успешно!') {
                    alert(data.message);
                    window.location.href = '/auth'; // Перенаправление на страницу входа
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert('Ошибка при подключении к серверу.');
            });
        });
    }

    // Обработчик для выхода
    document.addEventListener('click', function (event) {
        const logoutLink = event.target.closest('#logout-link');
        if (logoutLink) {
            event.preventDefault();
    
            fetch('http://localhost:3000/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Выход выполнен успешно!') {
                    updateAuthLinks(false);
                    window.location.href = '/'; // Перенаправляем на главную страницу
                }
            })
            .catch(error => {
                console.error('Ошибка при выходе:', error);
                alert('Ошибка при выходе.');
            });
        }
    });
});

// Функция для обновления кнопок авторизации
function updateAuthLinks(isLoggedIn, role = null) {
    const authLinks = document.getElementById('auth-links');
    if (!authLinks) {
        console.error('Элемент auth-links не найден');
        return;
    }

    if (isLoggedIn) {
        if (role === 'admin') {
            authLinks.innerHTML = `
                <li><a href="/admin">Администрирование</a></li>
                <li><a href="#" id="logout-link">Выйти</a></li>
            `;
        } else {
            authLinks.innerHTML = `
                <li><a href="/profile">Личный кабинет</a></li>
                <li><a href="#" id="logout-link">Выйти</a></li>
            `;
        }
    } else {
        authLinks.innerHTML = `
            <li><a href="/auth">Вход</a></li>
            <li><a href="/register">Регистрация</a></li>
        `;
    }
}

// Проверка состояния пользователя при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    fetch('http://localhost:3000/check-auth', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.isLoggedIn) {
            updateAuthLinks(true, data.role);
        } else {
            updateAuthLinks(false);
        }
    })
    .catch(error => {
        console.error('Ошибка при проверке авторизации:', error);
        updateAuthLinks(false);
    });
});