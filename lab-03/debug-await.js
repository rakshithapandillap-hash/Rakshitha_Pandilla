const dbPromise = require('./db');

const checkBooks = async () => {
    const db = await dbPromise;

    // Query without await
    const result = db.get('SELECT COUNT(*) AS count FROM book');

    console.log('Without await:', result);

    // Correct query with await
    const actualResult = await db.get(
        'SELECT COUNT(*) AS count FROM book'
    );

    console.log('With await:', actualResult);

    await db.close();
};

checkBooks();