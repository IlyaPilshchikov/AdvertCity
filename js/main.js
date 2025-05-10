const express = require('express');
const session = require('express-session');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const path = require('path');

const app = express();
const port = 3000;

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'users_db',
    password: '851425257',
    port: 5432,
});

client.connect()
  .then(() => {
      console.log('Подключение к базе данных установлено');
      // Создаем таблицу orders, если она еще не существует
      return client.query(`
          CREATE TABLE IF NOT EXISTS orders (
              id SERIAL PRIMARY KEY,
              user_id INTEGER,
              banner_type VARCHAR(10) NOT NULL,
              area FLOAT NOT NULL,
              material VARCHAR(10) NOT NULL,
              work_type VARCHAR(10) NOT NULL,
              urgency VARCHAR(10) NOT NULL,
              season VARCHAR(10) NOT NULL,
              design_complexity VARCHAR(10) NOT NULL,
              additional_area FLOAT DEFAULT 0,
              material_defect VARCHAR(10) NOT NULL,
              order_volume INTEGER NOT NULL,
              delivery_distance INTEGER DEFAULT 0,
              total_cost FLOAT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              status VARCHAR(20) DEFAULT 'in_progress' NOT NULL,
              CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
              CONSTRAINT check_status CHECK (status IN ('completed', 'in_progress', 'rejected'))
          );
      `);
  })
  .then(() => {
      console.log('Таблица orders готова');
      // Создаем таблицу offers для готовых предложений
      return client.query(`
          CREATE TABLE IF NOT EXISTS offers (
              id SERIAL PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              description TEXT NOT NULL,
              banner_type VARCHAR(10) NOT NULL,
              area FLOAT NOT NULL,
              material VARCHAR(10) NOT NULL,
              work_type VARCHAR(10) NOT NULL,
              urgency VARCHAR(10) NOT NULL,
              season VARCHAR(10) NOT NULL,
              design_complexity VARCHAR(10) NOT NULL,
              additional_area FLOAT DEFAULT 0,
              material_defect VARCHAR(10) NOT NULL,
              order_volume INTEGER NOT NULL,
              delivery_distance INTEGER DEFAULT 0,
              total_cost FLOAT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
      `);
  })
  .then(() => {
      console.log('Таблица offers готова');
      // Создаем таблицу pricing для хранения настроек цен
      return client.query(`
          CREATE TABLE IF NOT EXISTS pricing (
              id SERIAL PRIMARY KEY,
              key VARCHAR(50) NOT NULL UNIQUE,
              value FLOAT NOT NULL,
              description TEXT,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
      `);
  })
  .then(() => {
      console.log('Таблица pricing готова');
      // Инициализируем значения цен, если они еще не существуют
      return client.query(`
          INSERT INTO pricing (key, value, description) VALUES
          ('base_cost', 100, 'Базовая стоимость'),
          ('banner_type_1', 500, 'Стоимость суперсайта'),
          ('banner_type_2', 300, 'Стоимость билборда'),
          ('banner_type_3', 200, 'Стоимость лайтпостера'),
          ('banner_type_4', 400, 'Стоимость мультипиллара'),
          ('material_1', 50, 'Стоимость пластика'),
          ('material_2', 100, 'Стоимость металла'),
          ('material_3', 70, 'Стоимость ткани'),
          ('work_type_1', 200, 'Стоимость фотопечати'),
          ('work_type_2', 150, 'Стоимость ручной работы'),
          ('work_type_3', 180, 'Стоимость шелкографии'),
          ('urgency_2', 0.2, 'Надбавка за срочность (срочная)'),
          ('urgency_3', 0.4, 'Надбавка за срочность (очень срочная)'),
          ('season_1', -0.1, 'Скидка за низкий сезон'),
          ('season_3', 0.15, 'Надбавка за высокий сезон'),
          ('design_2', 0.15, 'Надбавка за среднюю сложность дизайна'),
          ('design_3', 0.3, 'Надбавка за сложный дизайн'),
          ('material_defect_2', 0.1, 'Надбавка за небольшие дефекты материала'),
          ('material_defect_3', 0.2, 'Надбавка за серьезные дефекты материала'),
          ('additional_area_cost', 50, 'Стоимость дополнительной площади (за кв. м)'),
          ('volume_discount_threshold', 10, 'Порог объема заказа для скидки'),
          ('volume_discount', 0.1, 'Скидка за большой объем заказа'),
          ('delivery_cost_per_km', 10, 'Стоимость доставки за 1 км')
          ON CONFLICT (key) DO NOTHING;
      `);
  })
  .then(() => {
      console.log('Значения цен инициализированы');
  })
  .catch(err => {
      console.error('Ошибка подключения к базе данных или создания таблиц:', err.stack);
  });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Настройка сессий
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middleware для отладки сессии
app.use((req, res, next) => {
    console.log('Текущая сессия:', req.session);
    next();
});

// Middleware для проверки роли администратора
const checkAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send('Доступ запрещён: требуется роль администратора');
    }
    next();
};

// Маршрут для авторизации
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Данные авторизации: email=${email}, password=${password}`);

    try {
        const result = await client.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            console.log('Авторизация успешна:', result.rows[0]);
            // Перенаправляем администратора на страницу администрирования
            if (result.rows[0].role === 'admin') {
                res.status(200).json({ message: 'Вход выполнен успешно!', redirect: '/admin' });
            } else {
                res.status(200).json({ message: 'Вход выполнен успешно!', redirect: '/profile' });
            }
        } else {
            console.log('Неверный логин или пароль');
            res.status(401).json({ message: 'Неверный логин или пароль' });
        }
    } catch (error) {
        console.error('Ошибка при обработке запроса на авторизацию:', error.message);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Маршрут для регистрации
app.post('/register', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        const checkEmail = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkEmail.rows.length > 0) {
            return res.status(400).json({ message: 'Этот email уже зарегистрирован' });
        }

        const result = await client.query('INSERT INTO users (email, password, role) VALUES ($1, $2, $3)', [email, password, role]);
        res.status(200).json({ message: 'Регистрация выполнена успешно!' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Маршрут для отправки заказа
app.post('/submit-order', async (req, res) => {
    console.log('Сессия при отправке заказа:', req.session);
    console.log('Пользователь в сессии:', req.session.user);
    const {
        banner_type,
        area,
        material,
        work_type,
        urgency,
        season,
        design_complexity,
        additional_area,
        material_defect,
        order_volume,
        delivery_distance,
        total_cost
    } = req.body;
    const userId = req.session.user ? req.session.user.id : null;
    console.log('Извлечённый userId:', userId);
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Пользователь не авторизован' });
    }
    try {
        const result = await client.query(
            `INSERT INTO orders (
                user_id, banner_type, area, material, work_type, urgency, season,
                design_complexity, additional_area, material_defect,
                order_volume, delivery_distance, total_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id`,
            [
                userId, banner_type, area, material, work_type, urgency, season,
                design_complexity, additional_area, material_defect,
                order_volume, delivery_distance, total_cost
            ]
        );

        res.json({ success: true, orderId: result.rows[0].id });
    } catch (error) {
        console.error('Ошибка при сохранении заказа:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Маршрут для добавления готового предложения в заказы
app.post('/add-offer-to-order', async (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Пользователь не авторизован' });
    }

    const { offerId } = req.body;

    try {
        // Получаем данные о готовом предложении
        const offerResult = await client.query('SELECT * FROM offers WHERE id = $1', [offerId]);
        if (offerResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Предложение не найдено' });
        }

        const offer = offerResult.rows[0];

        // Добавляем предложение как заказ
        const result = await client.query(
            `INSERT INTO orders (
                user_id, banner_type, area, material, work_type, urgency, season,
                design_complexity, additional_area, material_defect,
                order_volume, delivery_distance, total_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id`,
            [
                userId,
                offer.banner_type,
                offer.area,
                offer.material,
                offer.work_type,
                offer.urgency,
                offer.season,
                offer.design_complexity,
                offer.additional_area,
                offer.material_defect,
                offer.order_volume,
                offer.delivery_distance,
                offer.total_cost
            ]
        );

        res.json({ success: true, orderId: result.rows[0].id });
    } catch (error) {
        console.error('Ошибка при добавлении предложения в заказы:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Маршрут для проверки авторизации
app.get('/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ isLoggedIn: true, userId: req.session.user.id, role: req.session.user.role });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// Маршрут для личного кабинета (для обычных пользователей и менеджеров)
app.get('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth');
    }

    const user = req.session.user;

    // Если пользователь — администратор, перенаправляем на страницу администрирования
    if (user.role === 'admin') {
        return res.redirect('/admin');
    }

    try {
        let orders;
        if (user.role === 'manager') {
            // Для менеджера получаем все заказы
            const result = await client.query(`
                SELECT orders.*, users.email 
                FROM orders 
                LEFT JOIN users ON orders.user_id = users.id
                ORDER BY orders.created_at DESC
            `);
            orders = result.rows;
        } else {
            // Для пользователя получаем только его заказы
            const result = await client.query(
                'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
                [user.id]
            );
            orders = result.rows;
        }

        res.render('profile', {
            title: 'Личный кабинет',
            user: user,
            orders: orders,
            isManager: user.role === 'manager'
        });
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Маршрут для страницы администрирования (только для админов)
app.get('/admin', checkAdmin, async (req, res) => {
    try {
        // Получаем все готовые предложения
        const offersResult = await client.query('SELECT * FROM offers ORDER BY created_at DESC');
        const offers = offersResult.rows;

        // Получаем всех пользователей
        const usersResult = await client.query('SELECT * FROM users ORDER BY id');
        const users = usersResult.rows;

        // Получаем настройки цен
        const pricingResult = await client.query('SELECT * FROM pricing');
        const pricing = pricingResult.rows.reduce((acc, row) => {
            acc[row.key] = { value: row.value, description: row.description };
            return acc;
        }, {});

        res.render('admin', {
            title: 'Администрирование',
            user: req.session.user,
            offers: offers,
            users: users,
            pricing: pricing
        });
    } catch (error) {
        console.error('Ошибка при загрузке страницы администрирования:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Маршрут для добавления нового готового предложения
app.post('/admin/add-offer', checkAdmin, async (req, res) => {
    const {
        name, description, banner_type, area, material, work_type, urgency, season,
        design_complexity, additional_area, material_defect, order_volume, delivery_distance, total_cost
    } = req.body;

    try {
        await client.query(
            `INSERT INTO offers (
                name, description, banner_type, area, material, work_type, urgency, season,
                design_complexity, additional_area, material_defect, order_volume, delivery_distance, total_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                name, description, banner_type, area, material, work_type, urgency, season,
                design_complexity, additional_area || 0, material_defect, order_volume, delivery_distance || 0, total_cost
            ]
        );
        res.json({ success: true, message: 'Предложение добавлено' });
    } catch (error) {
        console.error('Ошибка при добавлении предложения:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Маршрут для редактирования готового предложения
app.post('/admin/edit-offer', checkAdmin, async (req, res) => {
    const {
        id, name, description, banner_type, area, material, work_type, urgency, season,
        design_complexity, additional_area, material_defect, order_volume, delivery_distance, total_cost
    } = req.body;

    try {
        await client.query(
            `UPDATE offers SET
                name = $1, description = $2, banner_type = $3, area = $4, material = $5, work_type = $6,
                urgency = $7, season = $8, design_complexity = $9, additional_area = $10, material_defect = $11,
                order_volume = $12, delivery_distance = $13, total_cost = $14
            WHERE id = $15`,
            [
                name, description, banner_type, area, material, work_type, urgency, season,
                design_complexity, additional_area || 0, material_defect, order_volume, delivery_distance || 0, total_cost, id
            ]
        );
        res.json({ success: true, message: 'Предложение обновлено' });
    } catch (error) {
        console.error('Ошибка при редактировании предложения:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Маршрут для удаления готового предложения
app.post('/admin/delete-offer', checkAdmin, async (req, res) => {
    const { id } = req.body;

    try {
        await client.query('DELETE FROM offers WHERE id = $1', [id]);
        res.json({ success: true, message: 'Предложение удалено' });
    } catch (error) {
        console.error('Ошибка при удалении предложения:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Маршрут для изменения роли пользователя
app.post('/admin/change-user-role', checkAdmin, async (req, res) => {
    const { userId, newRole } = req.body;

    const validRoles = ['user', 'manager', 'admin'];
    if (!validRoles.includes(newRole)) {
        return res.status(400).json({ success: false, message: 'Недопустимая роль' });
    }

    try {
        await client.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, userId]);
        res.json({ success: true, message: 'Роль пользователя обновлена' });
    } catch (error) {
        console.error('Ошибка при изменении роли пользователя:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Маршрут для удаления пользователя
app.post('/admin/delete-user', checkAdmin, async (req, res) => {
    const { userId } = req.body;

    try {
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ success: true, message: 'Пользователь удалён' });
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Маршрут для обновления настроек цен
app.post('/admin/update-pricing', checkAdmin, async (req, res) => {
    const pricingData = req.body; // Ожидаем объект с парами key-value

    try {
        for (const [key, value] of Object.entries(pricingData)) {
            await client.query(
                'UPDATE pricing SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
                [value, key]
            );
        }
        res.json({ success: true, message: 'Настройки цен обновлены' });
    } catch (error) {
        console.error('Ошибка при обновлении настроек цен:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Маршрут для удаления заказа (только для менеджера)
app.post('/delete-order', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'manager') {
        return res.status(403).json({ success: false, message: 'Доступ запрещён' });
    }

    const { orderId } = req.body;

    try {
        await client.query('DELETE FROM orders WHERE id = $1', [orderId]);
        res.json({ success: true, message: 'Заказ удалён' });
    } catch (error) {
        console.error('Ошибка при удалении заказа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Маршрут для обновления статуса заказа (только для менеджера)
app.post('/update-order-status', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'manager') {
        return res.status(403).json({ success: false, message: 'Доступ запрещён' });
    }

    const { orderId, status } = req.body;

    // Проверка входных данных
    if (!orderId || !status) {
        return res.status(400).json({ success: false, message: 'Не указаны ID заказа или статус' });
    }

    // Проверка допустимого значения статуса
    const validStatuses = ['completed', 'in_progress', 'rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Недопустимое значение статуса' });
    }

    try {
        // Проверяем, существует ли заказ
        const orderCheck = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Заказ не найден' });
        }

        // Обновляем статус заказа
        await client.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
        res.json({ success: true, message: 'Статус заказа обновлён' });
    } catch (error) {
        console.error('Ошибка при обновлении статуса заказа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Маршрут для страницы готовых предложений
app.get('/catalog', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM offers ORDER BY created_at DESC');
        const offers = result.rows;
        res.render('catalog', {
            title: 'Готовые предложения',
            user: req.session.user,
            offers: offers
        });
    } catch (error) {
        console.error('Ошибка при получении готовых предложений:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Статические файлы с правильным MIME-типом для .glb
const staticPath = path.resolve(__dirname, '..', 'static');
app.use('/static', express.static(staticPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.glb')) {
            res.setHeader('Content-Type', 'model/gltf-binary');
        }
    }
}));

// Настройки Handlebars
const viewsPath = path.resolve(__dirname, '..', 'views');
app.set('views', viewsPath);

// Регистрируем хелпер eq
const hbs = exphbs.create({
    defaultLayout: false,
    layoutsDir: false,
    extname: '.hbs',
    helpers: {
        eq: function (a, b) {
            return a === b;
        }
    }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// Маршруты для отображения страниц
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Главная',
        user: req.session.user
    });
});
app.get('/auth', (req, res) => res.render('auth', { title: 'Авторизация' }));
app.get('/evaluation', (req, res) => {
    console.log('Сессия на странице evaluation:', req.session);
    console.log('Пользователь на странице evaluation:', req.session.user);
    res.render('evaluation', { title: 'Оценка', user: req.session.user });
});
app.get('/reports', (req, res) => res.render('reports', { title: 'Отчеты' }));
app.get('/about', (req, res) => res.render('about', { title: 'О нас' }));
app.get('/news', (req, res) => res.render('news', { title: 'Новости' }));
app.get('/terms', (req, res) => res.render('terms', { title: 'Условия пользования' }));
app.get('/privacy', (req, res) => res.render('privacy', { title: 'Политика конфиденциальности' }));
app.get('/register', (req, res) => res.render('register', { title: 'Регистрация' }));
app.get('/get-pricing', async (req, res) => {
    try {
        const pricingResult = await client.query('SELECT * FROM pricing');
        const pricing = pricingResult.rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json({ success: true, pricing });
    } catch (error) {
        console.error('Ошибка при получении настроек цен:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});
// Маршрут для выхода (POST)
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Ошибка при выходе:', err);
            return res.status(500).json({ message: 'Ошибка при выходе' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Выход выполнен успешно!' });
    });
});
app.get('/admin/search-users', async (req, res) => {
    try {
        const { query, limit = 10, offset = 0 } = req.query;
        let usersQuery, countQuery;
        let usersResult, countResult;

        if (query && query.trim() !== '') {
            usersQuery = 'SELECT id, email, role FROM users WHERE email ILIKE $1 LIMIT $2 OFFSET $3';
            countQuery = 'SELECT COUNT(*) FROM users WHERE email ILIKE $1';
            usersResult = await client.query(usersQuery, [`%${query}%`, parseInt(limit), parseInt(offset)]);
            countResult = await client.query(countQuery, [`%${query}%`]);
        } else {
            usersQuery = 'SELECT id, email, role FROM users LIMIT $1 OFFSET $2';
            countQuery = 'SELECT COUNT(*) FROM users';
            usersResult = await client.query(usersQuery, [parseInt(limit), parseInt(offset)]);
            countResult = await client.query(countQuery);
        }

        const total = parseInt(countResult.rows[0].count);
        res.json({ success: true, users: usersResult.rows, total });
    } catch (error) {
        console.error('Ошибка при поиске пользователей:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});
// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});