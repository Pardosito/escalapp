document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');

    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const usernameInput = document.getElementById('username');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            if (!usernameInput || !emailInput || !passwordInput) {
                console.error('One or more input fields not found.');
                return;
            }

            const username = usernameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;

            const userData = {
                username: username,
                email: email,
                password: password
            };

            const registrationUrl = 'http://localhost:3000/login/';

            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            };

            try {
                const response = await fetch(registrationUrl, requestOptions);
                const data = await response.json();

                if (response.ok) {
                    console.log('Registration successful:', data);
                    // Optionally redirect the user or display a success message
                    alert('Signup successful!');
                    window.location.href = '/'; // Redirect to the homepage or another appropriate page
                } else {
                    console.error('Registration failed:', data);
                    // Display an error message to the user
                    alert('Signup failed: ' + (data.message || 'Something went wrong.'));
                }
            } catch (error) {
                console.error('Error during registration:', error);
                alert('Error during registration: ' + error.message);
            }
        });
    } else {
        console.log('Signup form with ID "signup-form" not found.');
    }
});