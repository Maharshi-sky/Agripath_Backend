async function testAPI() {
  try {
    const response = await fetch('http://localhost:5000/api/regulatory-pathway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Seeds & Varieties',
        technology: 'Certified Seed Variety',
        country: 'Algeria'
      })
    });

    const data = await response.json();
    console.log('Status Code:', response.status);
    console.log('Response Output:\n', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Connection Error:', err.message);
  }
}

testAPI();