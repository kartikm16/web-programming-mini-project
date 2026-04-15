/**
 * checkFarmerStatus() - Proactive Auth Check
 * Runs immediately on page load for farmer-login.html and farmer-register.html.
 */
async function checkFarmerStatus() {
    try {
        const res = await fetch('/api/user');
        if (res.ok) {
            const user = await res.json();
            const isLoginPage = window.location.pathname.includes('farmer-login.html');
            const isRegisterPage = window.location.pathname.includes('farmer-register.html');

            if (user.role === 'farmer') {
                // Already a farmer? Dashboard is that way!
                window.location.href = 'dashboard.html';
                return;
            }

            if (user && isLoginPage) {
                // Logged in via Google but not a farmer? Send to registration.
                console.log("Logged in via Google, but role is not farmer. Redirecting to registration.");
                window.location.href = 'farmer-register.html?msg=nonfarmer';
            }
        }
    } catch (err) {
        console.error("Auth check failed:", err);
    }
}

// Run the check immediately
document.addEventListener('DOMContentLoaded', checkFarmerStatus);
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateRegisterForm()) return;

        const fullName = document.getElementById('fullName').value.trim();
        const farmName = document.getElementById('farmName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const location = document.getElementById('location').value.trim();
        const experience = document.getElementById('experience').value.trim();
        const produceType = document.getElementById('produceType').value;
        const farmingMethod = document.getElementById('farmingMethod').value;
        const description = produceType + " farming using " + farmingMethod + " methods.";

        try {
            const res = await fetch('/api/farmer/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    fullName, farmName, phone, email, password, 
                    location, experience, produceType, farmingMethod, description 
                })
            });
            const data = await res.json();
            
            if (res.ok) {
                // Show toast then redirect
                const toast = document.getElementById('toast');
                if (toast) toast.classList.add('show');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                showFieldError('fg-email', data.error || 'Must be logged in via Google to turn into a Farmer!');
            }
        } catch(err) {
            console.error(err);
        }
    });

    function validateRegisterForm() {
        let valid = true;
        clearErrors();

        const fullName = document.getElementById('fullName').value.trim();
        const farmName = document.getElementById('farmName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const location = document.getElementById('location').value.trim();
        const experience = document.getElementById('experience').value.trim();
        const produceType = document.getElementById('produceType').value;
        const farmingMethod = document.getElementById('farmingMethod').value;

        if (!fullName) { showFieldError('fg-name', 'Please enter your full name.'); valid = false; }
        if (!farmName) { showFieldError('fg-farm', 'Please enter your farm name.'); valid = false; }
        if (!/^\d{10}$/.test(phone)) { showFieldError('fg-phone', 'Enter a valid 10-digit phone number.'); valid = false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('fg-email', 'Enter a valid email address.'); valid = false; }
        if (password && password.length < 6) { showFieldError('fg-password', 'Password must be at least 6 characters.'); valid = false; }
        if (!location) { showFieldError('fg-location', 'Please enter your farm location.'); valid = false; }
        if (!experience || isNaN(experience) || Number(experience) < 0) { showFieldError('fg-experience', 'Enter valid years of experience.'); valid = false; }
        if (!produceType) { showFieldError('fg-produce', 'Please select your produce type.'); valid = false; }
        if (!farmingMethod) { showFieldError('fg-method', 'Please select your farming method.'); valid = false; }

        return valid;
    }
}

// ============================================================
//  LOGIN PAGE LOGIC
// ============================================================
const loginForm = document.getElementById('login-form');
if (loginForm) {
    // Password toggle
    const pwToggle = document.getElementById('pw-toggle');
    const pwInput = document.getElementById('password');
    if (pwToggle && pwInput) {
        pwToggle.addEventListener('click', () => {
            const isText = pwInput.type === 'text';
            pwInput.type = isText ? 'password' : 'text';
            pwToggle.querySelector('i').className = isText ? 'ri-eye-off-line' : 'ri-eye-line';
        });
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        let valid = true;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFieldError('fg-email', 'Please enter a valid email.');
            valid = false;
        }
        if (!password) {
            showFieldError('fg-password', 'Please enter your password.');
            valid = false;
        }
        if (!valid) return;

        // Save session locally as fallback (legacy), but rely on server session
        fetch('/api/farmer/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.href = 'dashboard.html';
            } else {
                const globalErr = document.getElementById('global-error');
                if (globalErr) {
                    const msg = document.getElementById('global-error-msg');
                    if (msg) msg.textContent = data.error || 'Invalid credentials.';
                    globalErr.classList.add('show');
                }
            }
        })
        .catch(err => {
            console.error(err);
            showFieldError('fg-email', 'Connection error. Please try again.');
        });
    });
}

// ============================================================
//  HELPERS
// ============================================================
function showFieldError(groupId, msg) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.classList.add('error');
    const span = group.querySelector('.error-msg');
    if (span && msg) span.textContent = msg;
}

function clearErrors() {
    document.querySelectorAll('.form-group.error').forEach(g => g.classList.remove('error'));
    const globalErr = document.getElementById('global-error');
    if (globalErr) globalErr.classList.remove('show');
}
