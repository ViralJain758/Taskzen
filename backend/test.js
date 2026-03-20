fetch('http://127.0.0.1:5000/api/auth/reset-password/dummytoken', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'newpassword' })
})
.then(res => res.text().then(text => console.log('STATUS:', res.status, 'BODY:', text)))
.catch(err => console.error(err));
