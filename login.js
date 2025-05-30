// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBXIMSSJi8slhfMM41ClFjyw5i7XqxsSSg",
  authDomain: "planilha-640a2.firebaseapp.com",
  projectId: "planilha-640a2",
  storageBucket: "planilha-640a2.appspot.com",
  messagingSenderId: "446781442019",
  appId: "1:446781442019:web:4b759a9b21d155595682d6",
  measurementId: "G-5QSFJT0QXK"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.getElementById('loginForm').onsubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = '';
    try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'index.html';
    } catch (error) {
        let msg = 'Usuario ou senha invalidos.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = 'E-mail ou senha inválidos.';
        } else if (error.code === 'auth/invalid-email') {
            msg = 'E-mail inválido.';
        }
        errorDiv.textContent = msg;
    }
};

auth.onAuthStateChanged(user => {
    if (user) {
        window.location.href = 'index.html';
    }
});

// Criar modal de cadastro
const createRegisterModal = () => {
    const modal = document.createElement('div');
    modal.className = 'register-modal';
    modal.innerHTML = `
        <div class="register-modal-content">
            <div class="register-modal-header">
                <h3>Criar Nova Conta</h3>
                <button class="close-modal">&times;</button>
            </div>
            <form id="registerForm">
                <div class="form-group">
                    <label for="registerName">Nome Completo</label>
                    <input type="text" id="registerName" required placeholder="Digite seu nome completo">
                </div>
                <div class="form-group">
                    <label for="registerEmail">E-mail</label>
                    <input type="email" id="registerEmail" required placeholder="Digite seu e-mail">
                </div>
                <div class="form-group">
                    <label for="registerPassword">Senha</label>
                    <input type="password" id="registerPassword" required placeholder="Digite sua senha">
                </div>
                <div class="form-group">
                    <label for="confirmPassword">Confirmar Senha</label>
                    <input type="password" id="confirmPassword" required placeholder="Confirme sua senha">
                </div>
                <div id="registerError" class="login-error"></div>
                <button type="submit" class="btn-login">Criar Conta</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Estilos do modal
    const style = document.createElement('style');
    style.textContent = `
        .register-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .register-modal.active {
            display: flex;
        }
        .register-modal-content {
            background: #fff;
            padding: 2rem;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            position: relative;
        }
        .register-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .register-modal-header h3 {
            margin: 0;
            color: #333;
            font-size: 1.5rem;
        }
        .close-modal {
            background: none;
            border: none;
            font-size: 1.8rem;
            cursor: pointer;
            color: #666;
        }
        .close-modal:hover {
            color: #333;
        }
    `;
    document.head.appendChild(style);

    return modal;
};

// Inicializar modal de cadastro
const initRegisterModal = () => {
    const registerBtn = document.getElementById('registerBtn');
    const modal = createRegisterModal();
    const closeBtn = modal.querySelector('.close-modal');
    const registerForm = modal.querySelector('#registerForm');
    const registerError = modal.querySelector('#registerError');

    registerBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            registerError.textContent = 'As senhas não coincidem';
            return;
        }

        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({
                displayName: name
            });
            modal.classList.remove('active');
            document.getElementById('loginError').textContent = 'Conta criada com sucesso! Faça login para continuar.';
            document.getElementById('loginError').style.color = '#43aa8b';
        } catch (error) {
            registerError.textContent = error.message;
        }
    });
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    initRegisterModal();
    // Adicionar funcionalidade de redefinição de senha
    const forgotPasswordLink = document.querySelector('.forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt('Por favor, digite seu e-mail para redefinir a senha:');
            if (email) {
                try {
                    await firebase.auth().sendPasswordResetEmail(email);
                    alert('E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.');
                } catch (error) {
                    alert('Erro ao enviar e-mail de redefinição: ' + error.message);
                }
            }
        });
    }

    // ... resto do código existente ...
}); 