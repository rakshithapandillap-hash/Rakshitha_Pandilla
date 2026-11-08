
const BASE_URL = 'http://localhost:3000';

async function runTests() {
    // Test 1: Create a book
    console.log('\nTEST 1: CREATE BOOK');

    let response = await fetch(`${BASE_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Introduction to Algorithms',
            author: 'Thomas H. Cormen',
            price: 650,
            pages: 500
        })
    });

    let data = await response.json();
    console.log(response.status, data);

    const bookId = data.book?.id;

    // Test 2: Missing title
    console.log('\nTEST 2: MISSING TITLE');

    response = await fetch(`${BASE_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            author: 'Test Author',
            price: 300
        })
    });

    console.log(response.status, await response.json());

    // Test 3: Invalid price
    console.log('\nTEST 3: INVALID PRICE');

    response = await fetch(`${BASE_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Test Book',
            author: 'Test Author',
            price: 'abc'
        })
    });

    console.log(response.status, await response.json());

    if (!bookId) {
        console.log('Book creation failed. Skipping update and delete.');
        return;
    }

    // Test 4: Update book
    console.log('\nTEST 4: UPDATE BOOK');

    response = await fetch(`${BASE_URL}/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Updated Algorithms Book',
            author: 'Thomas H. Cormen',
            price: 700,
            pages: 520
        })
    });

    console.log(response.status, await response.json());

    // Test 5: Delete book
    console.log('\nTEST 5: DELETE BOOK');

    response = await fetch(`${BASE_URL}/books/${bookId}`, {
        method: 'DELETE'
    });

    console.log(response.status, await response.json());

    // Test 6: Missing book
    console.log('\nTEST 6: BOOK NOT FOUND');

    response = await fetch(`${BASE_URL}/books/99999`);

    console.log(response.status, await response.json());
}

runTests().catch(console.error);
