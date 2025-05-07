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
        let msg = 'Erro ao fazer login.';
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