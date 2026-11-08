
const express = require('express');
const dbPromise = require('./db');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Allowed sorting columns
const allowedColumns = ['id', 'title', 'author', 'price', 'pages'];

// Helper function for error responses
const sendError = (res, status, message) => {
    return res.status(status).json({ message });
};

// Validate book request body
const validateBook = (body = {}) => {
    const { title, author, price, pages } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
        return 'Title is required';
    }

    if (!author || typeof author !== 'string' || !author.trim()) {
        return 'Author is required';
    }

    if (
        price === undefined ||
        price === null ||
        price === '' ||
        !Number.isFinite(Number(price))
    ) {
        return 'Price must be a valid number';
    }

    if (Number(price) < 0) {
        return 'Price cannot be negative';
    }

    if (
        pages !== undefined &&
        (!Number.isInteger(Number(pages)) || Number(pages) <= 0)
    ) {
        return 'Pages must be a positive integer';
    }

    return null;
};

// Initialize database and start server
const initializeDBAndServer = async () => {
    try {
        const db = await dbPromise;

        // Create book table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS book (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                price INTEGER NOT NULL,
                pages INTEGER
            );
        `);

        // Insert sample records only when table is empty
        const result = await db.get(
            'SELECT COUNT(*) AS count FROM book'
        );

        if (result.count === 0) {
            const books = [
                ['Wings of Fire', 'A.P.J. Abdul Kalam', 250, 180],
                ['The Alchemist', 'Paulo Coelho', 300, 208],
                ['Atomic Habits', 'James Clear', 450, 320],
                ['Ikigai', 'Hector Garcia', 350, 194],
                ['Rich Dad Poor Dad', 'Robert Kiyosaki', 400, 336],
                ['The Power of Habit', 'Charles Duhigg', 500, 371],
                ['Deep Work', 'Cal Newport', 420, 296],
                ['Think and Grow Rich', 'Napoleon Hill', 280, 250],
                ['Harry Potter', 'J.K. Rowling', 550, 400],
                ['The Psychology of Money', 'Morgan Housel', 380, 256]
            ];

            for (const book of books) {
                await db.run(
                    `INSERT INTO book (title, author, price, pages)
                     VALUES (?, ?, ?, ?)`,
                    book
                );
            }

            console.log('10 sample books inserted successfully');
        }

        // 1. GET all books with search, sorting and filters
        app.get('/books', async (req, res) => {
            try {
                const {
                    search_q = '',
                    order_by = 'id',
                    order = 'ASC',
                    limit = '10',
                    offset = '0',
                    min_price,
                    max_price
                } = req.query;

                const sortColumn = String(order_by).toLowerCase();
                const sortOrder = String(order).toUpperCase();

                if (!allowedColumns.includes(sortColumn)) {
                    return sendError(res, 400, 'Invalid order_by column');
                }

                if (!['ASC', 'DESC'].includes(sortOrder)) {
                    return sendError(res, 400, 'Order must be ASC or DESC');
                }

                const pageLimit = Number(limit);
                const pageOffset = Number(offset);

                if (
                    !Number.isInteger(pageLimit) ||
                    pageLimit <= 0 ||
                    !Number.isInteger(pageOffset) ||
                    pageOffset < 0
                ) {
                    return sendError(
                        res,
                        400,
                        'Limit must be positive and offset must be non-negative integers'
                    );
                }

                if (
                    min_price !== undefined &&
                    !Number.isFinite(Number(min_price))
                ) {
                    return sendError(res, 400, 'Invalid minimum price');
                }

                if (
                    max_price !== undefined &&
                    !Number.isFinite(Number(max_price))
                ) {
                    return sendError(res, 400, 'Invalid maximum price');
                }

                if (
                    min_price !== undefined &&
                    max_price !== undefined &&
                    Number(min_price) > Number(max_price)
                ) {
                    return sendError(
                        res,
                        400,
                        'Minimum price cannot exceed maximum price'
                    );
                }

                let query = 'SELECT * FROM book WHERE 1 = 1';
                const params = [];

                // Search by partial book title
                if (search_q) {
                    query += ' AND title LIKE ?';
                    params.push(`%${search_q}%`);
                }

                // Minimum price filter
                if (min_price !== undefined) {
                    query += ' AND price >= ?';
                    params.push(Number(min_price));
                }

                // Maximum price filter
                if (max_price !== undefined) {
                    query += ' AND price <= ?';
                    params.push(Number(max_price));
                }

                // Sorting and pagination
                query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
                params.push(pageLimit, pageOffset);

                const books = await db.all(query, params);

                return res.status(200).json({
                    message: 'Books retrieved successfully',
                    count: books.length,
                    books
                });

            } catch (error) {
                return sendError(res, 500, 'Failed to retrieve books');
            }
        });

        // 2. GET one book by ID
        app.get('/books/:bookId', async (req, res) => {
            try {
                const { bookId } = req.params;

                if (!/^[1-9]\d*$/.test(bookId)) {
                    return sendError(res, 400, 'Invalid book ID');
                }

                const book = await db.get(
                    'SELECT * FROM book WHERE id = ?',
                    [bookId]
                );

                if (!book) {
                    return sendError(res, 404, 'Book not found');
                }

                return res.status(200).json({
                    message: 'Book retrieved successfully',
                    book
                });

            } catch (error) {
                return sendError(res, 500, 'Failed to retrieve book');
            }
        });

        // 3. POST - Add a new book
        app.post('/books', async (req, res) => {
            try {
                const validationError = validateBook(req.body);

                if (validationError) {
                    return sendError(res, 400, validationError);
                }

                const { title, author, price, pages } = req.body;

                const result = await db.run(
                    `INSERT INTO book (title, author, price, pages)
                     VALUES (?, ?, ?, ?)`,
                    [
                        title.trim(),
                        author.trim(),
                        Number(price),
                        pages === undefined ? null : Number(pages)
                    ]
                );

                const newBook = await db.get(
                    'SELECT * FROM book WHERE id = ?',
                    [result.lastID]
                );

                return res.status(201).json({
                    message: 'Book added successfully',
                    book: newBook
                });

            } catch (error) {
                return sendError(res, 500, 'Failed to add book');
            }
        });

        // 4. PUT - Update an existing book
        app.put('/books/:bookId', async (req, res) => {
            try {
                const { bookId } = req.params;

                if (!/^[1-9]\d*$/.test(bookId)) {
                    return sendError(res, 400, 'Invalid book ID');
                }

                const validationError = validateBook(req.body);

                if (validationError) {
                    return sendError(res, 400, validationError);
                }

                const existingBook = await db.get(
                    'SELECT * FROM book WHERE id = ?',
                    [bookId]
                );

                if (!existingBook) {
                    return sendError(res, 404, 'Book not found');
                }

                const { title, author, price, pages } = req.body;

                await db.run(
                    `UPDATE book
                     SET title = ?, author = ?, price = ?, pages = ?
                     WHERE id = ?`,
                    [
                        title.trim(),
                        author.trim(),
                        Number(price),
                        pages === undefined ? null : Number(pages),
                        bookId
                    ]
                );

                const updatedBook = await db.get(
                    'SELECT * FROM book WHERE id = ?',
                    [bookId]
                );

                return res.status(200).json({
                    message: 'Book updated successfully',
                    book: updatedBook
                });

            } catch (error) {
                return sendError(res, 500, 'Failed to update book');
            }
        });

        // 5. DELETE - Remove a book
        app.delete('/books/:bookId', async (req, res) => {
            try {
                const { bookId } = req.params;

                if (!/^[1-9]\d*$/.test(bookId)) {
                    return sendError(res, 400, 'Invalid book ID');
                }

                const existingBook = await db.get(
                    'SELECT * FROM book WHERE id = ?',
                    [bookId]
                );

                if (!existingBook) {
                    return sendError(res, 404, 'Book not found');
                }

                await db.run(
                    'DELETE FROM book WHERE id = ?',
                    [bookId]
                );

                return res.status(200).json({
                    message: 'Book deleted successfully'
                });

            } catch (error) {
                return sendError(res, 500, 'Failed to delete book');
            }
        });

        // Handle unknown routes
        app.use((req, res) => {
            return sendError(res, 404, 'Route not found');
        });

        console.log('Database connected successfully');
        console.log('Book table is ready');

        const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (error) => {
    console.error('Server Error:', error.code);
    console.error(error.message);
});
    } catch (error) {
        console.error('Database initialization failed:', error.message);
        process.exit(1);
    }
};

initializeDBAndServer();
