// 4D'S World - Admin Login Page Logic (separate page)
document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('admin-login-form');
    var passInput = document.getElementById('admin-pass');
    var loginBtn = document.getElementById('login-btn');
    var errorBox = document.getElementById('error-box');
    var errorMsg = document.getElementById('error-msg');

    if (!loginForm) return;

    function showError(msg) {
        errorMsg.textContent = msg;
        errorBox.classList.add('show');
    }

    function clearError() {
        errorBox.classList.remove('show');
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearError();

        var password = passInput.value;
        if (!password) {
            showError('Please enter the security password.');
            passInput.focus();
            return;
        }

        // Show loading state
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');

        try {
            var res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            var data = await res.json();

            if (data.success) {
                // Redirect to the dashboard - the session cookie persists
                window.location.href = '/admin-portal';
            } else {
                showError('Invalid Security Password. Please try again.');
                passInput.value = '';
                passInput.focus();
            }
        } catch (err) {
            showError('Connection error. Please check your internet connection and try again.');
        } finally {
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
        }
    });

    // Allow pressing Enter in the password field
    passInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginForm.requestSubmit();
        }
    });
});

