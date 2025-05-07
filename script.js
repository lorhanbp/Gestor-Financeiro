// Inicialização do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBXIMSSJi8slhfMM41ClFjyw5i7XqxsSSg",
  authDomain: "planilha-640a2.firebaseapp.com",
  projectId: "planilha-640a2",
  storageBucket: "planilha-640a2.appspot.com",
  messagingSenderId: "446781442019",
  appId: "1:446781442019:web:4b759a9b21d155595682d6",
  measurementId: "G-5QSFJT0QXK"
};
if (typeof firebase !== 'undefined' && firebase.apps && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Estado global da aplicação
const state = {
    transactions: [
        { id: 1, type: 'income', amount: 5000, description: 'Salário', category: 'Rendimento', date: '2023-05-05' },
        { id: 2, type: 'expense', amount: 1500, description: 'Aluguel', category: 'Moradia', date: '2023-05-01' },
        { id: 3, type: 'expense', amount: 450, description: 'Supermercado', category: 'Alimentação', date: '2023-04-30' }
    ],
    accounts: [],
    categories: [],
    currentSection: 'dashboard',
    variableIncome: [],
    reserves: [
        { id: 1, name: 'SANTANDER', value: 0, description: '' },
        { id: 2, name: 'ITAU', value: 0, description: '' },
        { id: 3, name: 'MERCADO PAGO', value: 0, description: '' },
        { id: 4, name: 'RECARGA PAY', value: 0, description: '' }
    ],
    fixedDebts: []
};

// Funções de persistência no Local Storage
function saveStateToLocalStorage() {
    localStorage.setItem('gestor_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('gestor_accounts', JSON.stringify(state.accounts));
    localStorage.setItem('gestor_categories', JSON.stringify(state.categories));
    localStorage.setItem('gestor_variableIncome', JSON.stringify(state.variableIncome));
    localStorage.setItem('gestor_reserves', JSON.stringify(state.reserves));
    localStorage.setItem('gestor_fixedDebts', JSON.stringify(state.fixedDebts));
}

function loadStateFromLocalStorage() {
    const transactions = localStorage.getItem('gestor_transactions');
    const accounts = localStorage.getItem('gestor_accounts');
    const categories = localStorage.getItem('gestor_categories');
    const variableIncome = localStorage.getItem('gestor_variableIncome');
    const reserves = localStorage.getItem('gestor_reserves');
    const fixedDebts = localStorage.getItem('gestor_fixedDebts');
    if (transactions) state.transactions = JSON.parse(transactions);
    if (accounts) state.accounts = JSON.parse(accounts);
    if (categories) state.categories = JSON.parse(categories);
    if (variableIncome) state.variableIncome = JSON.parse(variableIncome);
    if (reserves) state.reserves = JSON.parse(reserves);
    if (fixedDebts) state.fixedDebts = JSON.parse(fixedDebts);
    // Garantir as caixas padrão
    const defaultReserves = [
        { id: 1, name: 'SANTANDER', value: 0, description: '' },
        { id: 2, name: 'ITAU', value: 0, description: '' },
        { id: 3, name: 'MERCADO PAGO', value: 0, description: '' },
        { id: 4, name: 'RECARGA PAY', value: 0, description: '' }
    ];
    if (!state.reserves || !Array.isArray(state.reserves)) state.reserves = [];
    defaultReserves.forEach(def => {
        if (!state.reserves.some(r => r.name === def.name)) {
            state.reserves.push({ ...def, id: state.reserves.length ? Math.max(...state.reserves.map(r => r.id)) + 1 : def.id });
        }
    });
}

// Carregar dados ao iniciar
loadStateFromLocalStorage();

function addTransaction(transaction) {
    transaction.id = state.transactions.length ? Math.max(...state.transactions.map(t => t.id)) + 1 : 1;
    state.transactions.push(transaction);
    saveStateToLocalStorage();
        renderTransactions();
    updateDashboardUI(getDashboardData());
}

function getFilteredTransactions(startDate, endDate) {
    if (!startDate && !endDate) return state.transactions;
    return state.transactions.filter(t => {
        const d = new Date(t.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
    });
}

// Função base original do dashboard
function getDashboardDataBase(transactions = state.transactions) {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalReserve = transactions.filter(t => t.type === 'reserve').reduce((sum, t) => sum + t.amount, 0);

    // CATEGORIAS DINÂMICAS
    const categoriasUnicas = [...new Set(transactions.map(t => t.category).filter(Boolean))];
    const colors = ['#4CAF50', '#F44336', '#FF9800', '#2196F3', '#9C27B0', '#FF9F40', '#ffb300', '#e74c3c'];
    const categoryData = categoriasUnicas.map((cat, i) => ({
        name: cat,
        amount: transactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0),
        // Se a categoria for "Outros", use amarelo
    
        color: cat === 'Outros' ? '#FFEB3B' : colors[i % colors.length]
    })).filter(item => item.amount > 0);

    // Agrupar por mês/ano
    const monthlyMap = {};
    transactions.forEach(t => {
        const [year, month] = t.date.split('-');
        const key = `${month}/${year.slice(2)}`;
        if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0, reserve: 0 };
        if (t.type === 'income') monthlyMap[key].income += t.amount;
        else if (t.type === 'expense') monthlyMap[key].expenses += t.amount;
        else if (t.type === 'reserve') monthlyMap[key].reserve += t.amount;
    });
    const monthlyData = Object.entries(monthlyMap).sort().map(([month, vals]) => ({
        month,
        income: vals.income,
        expenses: vals.expenses,
        reserve: vals.reserve
    }));
    const totalCaixas = state.reserves.reduce((sum, c) => sum + c.value, 0);
    return {
        balance: totalIncome - totalExpenses - totalReserve - totalCaixas,
        income: totalIncome,
        expenses: totalExpenses,
        reserve: totalReserve + totalCaixas,
        categoryData,
        monthlyData
    };
}

// Função final do dashboard, integrando dívidas fixas
function getDashboardData(transactions = state.transactions) {
    let data = getDashboardDataBase(transactions);
    // Somar dívidas fixas não pagas às despesas
    if (state.fixedDebts && state.fixedDebts.length > 0) {
        // Adiciona ao total de despesas
        const totalFixas = state.fixedDebts.filter(d => !d.paid).reduce((sum, d) => sum + d.value, 0);
        data.expenses += totalFixas;
        // Adiciona ao gráfico de pizza (categoria Dívidas Fixas)
        const idx = data.categoryData.findIndex(c => c.name === 'Dívidas Fixas');
        if (idx >= 0) {
            data.categoryData[idx].amount += totalFixas;
        } else if (totalFixas > 0) {
            data.categoryData.push({ name: 'Dívidas Fixas', amount: totalFixas, color: '#e74c3c' });
        }
        // Adiciona ao fluxo mensal (mês de vencimento)
        state.fixedDebts.filter(d => !d.paid).forEach(d => {
            if (d.dueDate) {
                const [ano, mes] = d.dueDate.split('-');
                const key = `${mes}/${ano.slice(2)}`;
                let found = false;
                for (let m of data.monthlyData) {
                    if (m.month === key) {
                        m.expenses += d.value;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    data.monthlyData.push({ month: key, income: 0, expenses: d.value, reserve: 0 });
                }
            }
        });
    }
    // Calcular o valor recebido da renda variável (apenas valor da parcela paga)
    let totalRendaVariavelRecebida = 0;
    if (state.variableIncome && state.variableIncome.length > 0) {
        state.variableIncome.forEach(item => {
            if (item.paid) {
                if (item.installmentValue) {
                    totalRendaVariavelRecebida += item.installmentValue;
                } else if (item.totalValue) {
                    totalRendaVariavelRecebida += item.totalValue;
                }
            }
        });
    }
    // Ajustar o card de receita para somar receitas variáveis pagas (apenas valor da parcela)
    data.income = data.income + totalRendaVariavelRecebida;
    // Saldo: receitas + renda variável recebida - despesas - reserva
    data.balance = data.income - data.expenses - data.reserve;
    return data;
}

function renderTransactions() {
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = state.transactions.map(transaction => `
        <tr>
            <td>${transaction.type === 'income' ? 'Receita' : transaction.type === 'expense' ? 'Despesa' : 'Reserva'}</td>
            <td class="${transaction.type === 'income' ? 'text-success' : transaction.type === 'expense' ? 'text-danger' : 'text-warning'}">
                R$ ${transaction.amount.toFixed(2)}
            </td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td>${formatDateBR(transaction.date)}</td>
            <td>
                <button class="btn-action" onclick="editTransaction(${transaction.id})" title="Editar"><i class="fas fa-pen"></i></button>
                <button class="btn-action" onclick="deleteTransaction(${transaction.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveStateToLocalStorage();
    renderTransactions();
    updateDashboardUI(getDashboardData());
}

function showAddTransactionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Nova Transação</h2>
                <button class="close-modal">&times;</button>
                </div>
            <form id="addTransactionForm">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="type" required>
                            <option value="income">Receita</option>
                            <option value="expense">Despesa</option>
                            <option value="reserve">Reserva</option>
                        </select>
                </div>
                    <div class="form-group">
                        <label>Valor</label>
                        <input type="number" name="amount" required min="0.01" step="0.01">
            </div>
                    <div class="form-group">
                        <label>Descrição</label>
                        <input type="text" name="description" required>
            </div>
                    <div class="form-group">
                        <label>Categoria</label>
                        <select name="category" required>
                            <option value="">Selecione uma categoria</option>
                            <option value="Rendimento">Rendimento</option>
                            <option value="Moradia">Moradia</option>
                            <option value="Alimentação">Alimentação</option>
                            <option value="Serviços">Serviços</option>
                            <option value="Saúde">Saúde</option>
                            <option value="Outros">Outros</option>
                        </select>
            </div>
                    <div class="form-group">
                        <label>Data</label>
                        <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}">
                </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary close-modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
            </form>
            </div>
        `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => modal.remove();
    });
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    modal.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const transaction = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description'),
            category: formData.get('category'),
            date: formData.get('date')
        };
        addTransaction(transaction);
        modal.remove();
    };
}

function renderLembretesVencimento() {
    const tbody = document.getElementById('lembreteTableBody');
    if (!tbody) return;

    const hoje = new Date();
    const lembretes = [];

    // Adicionar despesas fixas (exceto categoria 'Outros')
    if (state.fixedDebts && state.fixedDebts.length > 0) {
        state.fixedDebts.forEach(item => {
            if (!item.paid && item.dueDate && (!item.category || item.category !== 'Outros')) {
                const dataVencimento = new Date(item.dueDate);
                const diasParaVencer = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
                lembretes.push({
                    tipo: 'Despesa Fixa',
                    descricao: item.description,
                    valor: item.value,
                    vencimento: item.dueDate,
                    dias: diasParaVencer
                });
            }
        });
    }

    // Adicionar receitas variáveis (exceto categoria 'Outros')
    if (state.variableIncome && state.variableIncome.length > 0) {
        state.variableIncome.forEach(item => {
            if (!item.paid && item.dueDate && (!item.category || item.category !== 'Outros')) {
                const dataVencimento = new Date(item.dueDate);
                const diasParaVencer = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
                lembretes.push({
                    tipo: 'Receita Variável',
                    descricao: item.description,
                    valor: item.installmentValue || item.totalValue,
                    vencimento: item.dueDate,
                    dias: diasParaVencer
                });
            }
        });
    }

    // Ordenar por dias para vencer
    lembretes.sort((a, b) => a.dias - b.dias);

    if (lembretes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ccc;">Nenhum lembrete de vencimento.</td></tr>';
        return;
    }

    tbody.innerHTML = lembretes.map(item => `
        <tr>
            <td>${item.tipo}</td>
            <td>${item.descricao}</td>
            <td>${formatMoney(item.valor)}</td>
            <td>${formatDateBR(item.vencimento)}</td>
            <td style="color: ${item.dias < 0 ? '#ff4444' : item.dias <= 3 ? '#ffb300' : '#fff'}">
                ${item.dias < 0 ? `${Math.abs(item.dias)} dias atrasado` : `${item.dias} dias`}
            </td>
        </tr>
    `).join('');
}

function updateDashboardUI(data, transactions = state.transactions) {
    document.getElementById('dashboardIncome').textContent = formatMoney(data.income);
    document.getElementById('dashboardExpense').textContent = formatMoney(data.expenses);
    document.getElementById('dashboardBalance').textContent = formatMoney(data.balance);
    document.getElementById('dashboardReserve').textContent = formatMoney(data.reserve);
    
    // Calcular o valor das parcelas do mês atual da renda variável
    const hoje = new Date();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const anoAtual = String(hoje.getFullYear());
    let totalParcelasMes = 0;
    if (state.variableIncome && state.variableIncome.length > 0) {
        state.variableIncome.forEach(item => {
            if (item.paid) return;
            if (item.installments && item.installmentValue) {
                // Parcelada: calcular mês de cada parcela
                const [ano, mes] = item.dueDate.split('-');
                let m = parseInt(mes, 10);
                let a = parseInt(ano, 10);
                for (let i = 0; i < item.installments; i++) {
                    if (String(m).padStart(2, '0') === mesAtual && String(a) === anoAtual) {
                        totalParcelasMes += item.installmentValue;
                    }
                    m++;
                    if (m > 12) { m = 1; a++; }
                }
            } else {
                // Não parcelada: considerar se o mês de vencimento é o atual
                const [ano, mes] = item.dueDate.split('-');
                if (mes === mesAtual && ano === anoAtual) {
                    totalParcelasMes += item.totalValue;
                }
            }
        });
    }
    const rendaVarEl = document.getElementById('dashboardVariableIncome');
    if (rendaVarEl) rendaVarEl.textContent = formatMoney(totalParcelasMes);
    
    updateDashboardCharts(data);
    renderLembretesVencimento();
}

function updateDashboardCharts(data) {
    // Gráfico de Pizza (Categorias)
    const pieCanvas = document.getElementById('categoryPieChart');
    if (!pieCanvas) return; // Não tenta renderizar se não existir
    const pieCtx = pieCanvas.getContext('2d');
    if (window.categoryPieChart && typeof window.categoryPieChart.destroy === 'function') {
        window.categoryPieChart.destroy();
    }
    // Calcular porcentagens
    const total = data.categoryData.reduce((sum, item) => sum + item.amount, 0);
    const legendLabels = data.categoryData.map(item => {
        const percent = total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0.0';
        return item.name + `\n${percent}%`;
    });
    window.categoryPieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: legendLabels,
            datasets: [{
                data: data.categoryData.map(item => item.amount),
                backgroundColor: data.categoryData.map(item => item.color),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff',
                        font: { size: 15 },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                    return {
                                        text: `${label.split('\n')[0]}\n${percent}%`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: '#23272f',
                                        lineWidth: 2,
                                        hidden: isNaN(data.datasets[0].data[i]) || chart.getDataVisibility(i) === false,
                                        index: i,
                                        fontColor: '#fff'
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribuição por Categoria',
                    color: '#fff',
                    font: { size: 18 }
                }
            }
        }
    });

    // Gráfico de Barras Horizontais (Últimos 6 meses)
    const barCanvas = document.getElementById('monthlyBarChart');
    if (!barCanvas) return;
    const barCtx = barCanvas.getContext('2d');
    if (window.monthlyBarChart && typeof window.monthlyBarChart.destroy === 'function') {
        window.monthlyBarChart.destroy();
    }
    window.monthlyBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: data.monthlyData.map(item => item.month),
            datasets: [
                {
                    label: 'Receitas',
                    data: data.monthlyData.map(item => item.income),
                    backgroundColor: '#43aa8b',
                    borderWidth: 1
                },
                {
                    label: 'Despesas',
                    data: data.monthlyData.map(item => item.expenses),
                    backgroundColor: '#F44336',
                    borderWidth: 1
                },
                {
                    label: 'Reservas',
                    data: data.monthlyData.map(item => item.reserve),
                    backgroundColor: '#ffb300',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff',
                        font: { size: 15 },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                    return {
                                        text: `${label.split('\n')[0]}\n${percent}%`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: '#23272f',
                                        lineWidth: 2,
                                        hidden: isNaN(data.datasets[0].data[i]) || chart.getDataVisibility(i) === false,
                                        index: i,
                                        fontColor: '#fff'
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribuição por Categoria',
                    color: '#fff',
                    font: { size: 18 }
                }
            }
        }
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionId + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    // Marcar item do menu lateral como ativo
    document.querySelectorAll('.sidebar nav ul li').forEach(li => li.classList.remove('active'));
    const activeLink = document.querySelector('.sidebar nav a[href="#' + sectionId + '"]');
    if (activeLink && activeLink.parentElement) {
        activeLink.parentElement.classList.add('active');
    }
    // Atualizar dashboard ao voltar para ele
    if (sectionId === 'dashboard') {
        updateDashboardUI(getDashboardData());
    }
    // Atualizar resumo financeiro ao entrar em relatórios
    if (sectionId === 'reports') {
        updateReportsSummary(getDashboardData());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Navegação entre seções
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.closest('a').getAttribute('href').substring(1);
            showSection(section);
            if (section === 'variableIncome') renderVariableIncomeTable();
            if (section === 'fixedDebts') renderFixedDebtsTable();
        });
    });
    // Botão Nova Transação
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    if (addTransactionBtn) addTransactionBtn.addEventListener('click', showAddTransactionModal);
    // Botão Nova Receita Variável
    const addVariableIncomeBtn = document.getElementById('addVariableIncomeBtn');
    if (addVariableIncomeBtn) addVariableIncomeBtn.addEventListener('click', showAddVariableIncomeModal);
    // Botão Nova Despesa
    const addFixedDebtBtn = document.getElementById('addFixedDebtBtn');
    if (addFixedDebtBtn) addFixedDebtBtn.addEventListener('click', showAddFixedDebtModal);
    // Filtro de data do gráfico de pizza
    const openCalendarFilter = document.getElementById('openCalendarFilter');
    const calendarFilterPopup = document.getElementById('calendarFilterPopup');
    if (openCalendarFilter && calendarFilterPopup) {
        // Conteúdo do popup: inputs de data
        calendarFilterPopup.innerHTML = `
            <label for="pieStartDate" style="display:block;font-size:0.95em;color:#333;margin-bottom:4px;">Data inicial:</label>
            <input type="date" id="pieStartDate" style="margin-bottom:8px;width:100%;padding:4px;">
            <label for="pieEndDate" style="display:block;font-size:0.95em;color:#333;margin-bottom:4px;">Data final:</label>
            <input type="date" id="pieEndDate" style="margin-bottom:8px;width:100%;padding:4px;">
            <button id="applyPieDateFilter" class="btn btn-primary" style="width:100%;margin-top:6px;">Filtrar</button>
        `;
        openCalendarFilter.addEventListener('click', (e) => {
            e.stopPropagation();
            if (calendarFilterPopup.style.display === 'none' || !calendarFilterPopup.style.display) {
                calendarFilterPopup.style.display = 'block';
            } else {
                calendarFilterPopup.style.display = 'none';
            }
        });
        // Fechar popup ao clicar fora
        document.addEventListener('click', (e) => {
            if (!calendarFilterPopup.contains(e.target) && e.target !== openCalendarFilter) {
                calendarFilterPopup.style.display = 'none';
            }
        });
    }
    // Renderizar tabelas e dashboard
    renderTransactions();
    updateDashboardUI(getDashboardData());
    renderVariableIncomeTable();
    renderFixedDebtsTable();
    // Modo noturno funcional
    const themeToggle = document.getElementById('themeToggle');
    function applyTheme(isDark) {
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('gestor_theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('gestor_theme', 'light');
        }
    }
    if (themeToggle) {
        // Carregar preferência
        const savedTheme = localStorage.getItem('gestor_theme');
        if (savedTheme === 'dark') {
            themeToggle.checked = true;
            applyTheme(true);
        } else {
            themeToggle.checked = false;
            applyTheme(false);
        }
        themeToggle.addEventListener('change', () => {
            applyTheme(themeToggle.checked);
        });
    }
    // Exportar Transações
    const exportTransacoesBtn = document.getElementById('exportTransacoesBtn');
    if (exportTransacoesBtn) {
        exportTransacoesBtn.addEventListener('click', () => {
            const data = state.transactions.map(t => ({
                'Tipo': t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Reserva',
                'Valor': t.amount,
                'Descrição': t.description || '',
                'Categoria': t.category || '',
                'Data': t.date
            }));
            const ws = window.XLSX.utils.json_to_sheet(data);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, 'Transações');
            window.XLSX.writeFile(wb, 'transacoes.xlsx');
        });
    }
    // Exportar Receita Variável
    const exportReceitaVariavelBtn = document.getElementById('exportReceitaVariavelBtn');
    if (exportReceitaVariavelBtn) {
        exportReceitaVariavelBtn.addEventListener('click', () => {
            const data = state.variableIncome.map(r => ({
                'Descrição': r.description || '',
                'Valor Total': r.totalValue || '',
                'Valor Parcela': r.installmentValue || '',
                'Parcelas': r.installments || '',
                'Vencimento': r.dueDate || '',
                'Pago': r.paid ? 'Sim' : 'Não',
                'Categoria': r.category || ''
            }));
            const ws = window.XLSX.utils.json_to_sheet(data);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, 'Receita Variável');
            window.XLSX.writeFile(wb, 'receita_variavel.xlsx');
        });
    }
    // Exportar Despesas Fixas
    const exportDespesasFixasBtn = document.getElementById('exportDespesasFixasBtn');
    if (exportDespesasFixasBtn) {
        exportDespesasFixasBtn.addEventListener('click', () => {
            const data = state.fixedDebts.map(d => ({
                'Descrição': d.description || '',
                'Valor': d.value || '',
                'Vencimento': d.dueDate || '',
                'Pago': d.paid ? 'Sim' : 'Não',
                'Categoria': d.category || ''
            }));
            const ws = window.XLSX.utils.json_to_sheet(data);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, 'Despesas Fixas');
            window.XLSX.writeFile(wb, 'despesas_fixas.xlsx');
        });
    }
    // Adicione aqui outros eventos de botões conforme necessário
});

function formatMoney(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateBR(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Funções para renderizar as tabelas de Receita Variável e Despesas Fixas
function renderVariableIncomeTable() {
    const tbody = document.getElementById('variableIncomeTableBody');
    if (!tbody) return;
    tbody.innerHTML = (state.variableIncome || []).map((item, idx) => {
        // Garantir que sempre exista o campo installments
        let parcelas = parseInt(item.installments);
        if (!parcelas || isNaN(parcelas) || parcelas < 1) parcelas = 1;
        // Calcular valor atualizado baseado nas parcelas pagas
        let valorAtualizado = item.totalValue;
        if (item.paid) {
            valorAtualizado = 0;
        } else if (parcelas && item.installmentValue) {
            const hoje = new Date();
            const dataVencimento = new Date(item.dueDate);
            const [ano, mes] = item.dueDate.split('-');
            let m = parseInt(mes, 10);
            let a = parseInt(ano, 10);
            let parcelasVencidas = 0;
            for (let i = 0; i < parcelas; i++) {
                const dataParcela = new Date(a, m - 1, dataVencimento.getDate());
                if (dataParcela < hoje) {
                    parcelasVencidas++;
                }
                m++;
                if (m > 12) { m = 1; a++; }
            }
            valorAtualizado = item.totalValue - (parcelasVencidas * item.installmentValue);
            if (valorAtualizado < 0) valorAtualizado = 0;
        }
        return `
            <tr data-index="${idx}">
                <td>${item.description || ''}</td>
                <td>${formatMoney(item.totalValue || 0)}</td>
                <td>${formatMoney(item.installmentValue || 0)}</td>
                <td>${parcelas} parcela${parcelas > 1 ? 's' : ''}</td>
                <td>${formatDateBR(item.dueDate)}</td>
                <td>${formatMoney(valorAtualizado)}</td>
                <td>
                    <input type="checkbox" class="check-paid-variable" data-index="${idx}" ${item.paid ? 'checked' : ''}> Pago
                </td>
                <td>
                    <button class="btn-action edit-variable" title="Editar" data-index="${idx}"><i class="fas fa-pen"></i></button>
                    <button class="btn-action delete-variable" title="Apagar" data-index="${idx}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    // Eventos de ação
    tbody.querySelectorAll('.edit-variable').forEach(btn => {
        btn.onclick = (e) => {
            highlightRow(e.target.closest('tr'));
            editVariableIncome(btn.dataset.index);
        };
    });
    tbody.querySelectorAll('.delete-variable').forEach(btn => {
        btn.onclick = (e) => {
            highlightRow(e.target.closest('tr'));
            deleteVariableIncome(btn.dataset.index);
        };
    });
    tbody.querySelectorAll('.check-paid-variable').forEach(chk => {
        chk.onchange = (e) => {
            const idx = chk.dataset.index;
            state.variableIncome[idx].paid = chk.checked;
            saveStateToLocalStorage();
            updateDashboardUI(getDashboardData());
        };
    });
}

function renderFixedDebtsTable() {
    const tbody = document.getElementById('fixedDebtsTableBody');
    if (!tbody) return;
    tbody.innerHTML = (state.fixedDebts || []).map((item, idx) => `
        <tr data-index="${idx}">
            <td>${item.description || ''}</td>
            <td>${formatMoney(item.value || 0)}</td>
            <td>${formatDateBR(item.dueDate)}</td>
            <td>
                <input type="checkbox" class="check-paid-fixed" data-index="${idx}" ${item.paid ? 'checked' : ''}> Pago
            </td>
            <td>
                <button class="btn-action edit-fixed" title="Editar" data-index="${idx}"><i class="fas fa-pen"></i></button>
                <button class="btn-action delete-fixed" title="Apagar" data-index="${idx}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    // Eventos de ação
    tbody.querySelectorAll('.edit-fixed').forEach(btn => {
        btn.onclick = (e) => {
            highlightRow(e.target.closest('tr'));
            editFixedDebt(btn.dataset.index);
        };
    });
    tbody.querySelectorAll('.delete-fixed').forEach(btn => {
        btn.onclick = (e) => {
            highlightRow(e.target.closest('tr'));
            deleteFixedDebt(btn.dataset.index);
        };
    });
    tbody.querySelectorAll('.check-paid-fixed').forEach(chk => {
        chk.onchange = (e) => {
            const idx = chk.dataset.index;
            state.fixedDebts[idx].paid = chk.checked;
            saveStateToLocalStorage();
            updateDashboardUI(getDashboardData());
            renderDashboardExtract();
        };
    });
}

// Função para destacar linha selecionada
function highlightRow(row) {
    document.querySelectorAll('tr.selected-row').forEach(r => r.classList.remove('selected-row'));
    if (row) row.classList.add('selected-row');
}

// Funções de edição e remoção para Receita Variável
function editVariableIncome(idx) {
    const item = state.variableIncome[idx];
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Editar Receita</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="editVariableIncomeForm">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Descrição</label>
                        <input type="text" name="description" required value="${item.description || ''}">
                    </div>
                    <div class="form-group">
                        <label>Valor Total</label>
                        <input type="number" name="totalValue" required min="0.01" step="0.01" value="${item.totalValue || ''}">
                    </div>
                    <div class="form-group">
                        <label>Valor da Parcela</label>
                        <input type="number" name="installmentValue" min="0.01" step="0.01" value="${item.installmentValue || ''}">
                    </div>
                    <div class="form-group">
                        <label>Data de Vencimento</label>
                        <input type="date" name="dueDate" required value="${item.dueDate || ''}">
                    </div>
                    <div class="form-group">
                        <label>Nº de Parcelas</label>
                        <input type="number" name="installments" min="1" step="1" value="${item.installments || 1}">
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary close-modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => modal.remove();
    });
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    modal.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        item.description = formData.get('description');
        item.totalValue = parseFloat(formData.get('totalValue'));
        item.installmentValue = parseFloat(formData.get('installmentValue')) || 0;
        item.dueDate = formData.get('dueDate');
        item.installments = parseInt(formData.get('installments')) || 1;
        saveStateToLocalStorage();
        renderVariableIncomeTable();
        updateDashboardUI(getDashboardData());
        renderDashboardExtract();
        modal.remove();
    };
}

function deleteVariableIncome(idx) {
    if (confirm('Deseja realmente apagar esta Receita Variável?')) {
        state.variableIncome.splice(idx, 1);
        saveStateToLocalStorage();
        renderVariableIncomeTable();
    }
}

// Funções de edição e remoção para Despesa Fixa
function editFixedDebt(idx) {
    const item = state.fixedDebts[idx];
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Editar Despesa</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="editFixedDebtForm">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Descrição</label>
                        <input type="text" name="description" required value="${item.description || ''}">
                    </div>
                    <div class="form-group">
                        <label>Valor</label>
                        <input type="number" name="value" required min="0.01" step="0.01" value="${item.value || ''}">
                    </div>
                    <div class="form-group">
                        <label>Data de Vencimento</label>
                        <input type="date" name="dueDate" required value="${item.dueDate || ''}">
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary close-modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => modal.remove();
    });
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    modal.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        item.description = formData.get('description');
        item.value = parseFloat(formData.get('value'));
        item.dueDate = formData.get('dueDate');
        saveStateToLocalStorage();
        renderFixedDebtsTable();
        updateDashboardUI(getDashboardData());
        renderDashboardExtract();
        modal.remove();
    };
}

function deleteFixedDebt(idx) {
    if (confirm('Deseja realmente apagar esta Despesa Fixa?')) {
        state.fixedDebts.splice(idx, 1);
        saveStateToLocalStorage();
        renderFixedDebtsTable();
    }
}

// Adicionar estilo para linha selecionada
const style = document.createElement('style');
style.innerHTML = `
tr.selected-row { background: #ffe082 !important; }
.btn-action { background: none; border: none; color: #888; cursor: pointer; font-size: 1.1em; margin: 0 2px; }
.btn-action:hover { color: #2196F3; }
`;
document.head.appendChild(style);

// Função para atualizar informações do usuário logado
function updateUserInfo() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            const userNameEl = document.getElementById('userName');
            const userEmailEl = document.getElementById('userEmail');
            const userAvatarEl = document.getElementById('userAvatar');
            if (user) {
                userNameEl.textContent = user.displayName || 'Usuário';
                userEmailEl.textContent = user.email || '';
                userAvatarEl.textContent = (user.displayName ? user.displayName[0] : (user.email ? user.email[0] : '?')).toUpperCase();
            } else {
                userNameEl.textContent = '';
                userEmailEl.textContent = '';
                userAvatarEl.textContent = '';
            }
        });
    }
}

// Função para logout
function logout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(function() {
            window.location.href = 'login.html';
        });
    }
}

// Função para alterar nome do usuário
function editUserName() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const novoNome = prompt('Digite o novo nome de usuário:', user.displayName || '');
        if (novoNome && novoNome.trim() !== '') {
            user.updateProfile({ displayName: novoNome.trim() }).then(function() {
                updateUserInfo();
                alert('Nome atualizado com sucesso!');
            }).catch(function(error) {
                alert('Erro ao atualizar nome: ' + error.message);
            });
        }
    }
}

// Adicionar eventos aos botões de sair e alterar nome
if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').onclick = logout;
}
if (document.getElementById('editNameBtn')) {
    document.getElementById('editNameBtn').onclick = editUserName;
}

// Atualizar informações do usuário ao carregar
updateUserInfo();

// Verificação de autenticação Firebase
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = 'login.html';
        }
    });
}

function showAddVariableIncomeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Nova Receita</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="addVariableIncomeForm">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Descrição</label>
                        <input type="text" name="description" required>
                    </div>
                    <div class="form-group">
                        <label>Valor Total</label>
                        <input type="number" name="totalValue" required min="0.01" step="0.01" id="inputTotalValue">
                    </div>
                    <div class="form-group">
                        <label>Nº de Parcelas</label>
                        <input type="number" name="installments" min="1" step="1" id="inputInstallments">
                    </div>
                    <div class="form-group">
                        <label>Valor da Parcela</label>
                        <input type="number" name="installmentValue" min="0.01" step="0.01" id="inputInstallmentValue">
                    </div>
                    <div class="form-group">
                        <label>Data de Vencimento</label>
                        <input type="date" name="dueDate" required id="inputDueDate">
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary close-modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => modal.remove();
    });
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    // Cálculo automático do valor da parcela
    const totalValueInput = modal.querySelector('#inputTotalValue');
    const installmentsInput = modal.querySelector('#inputInstallments');
    const installmentValueInput = modal.querySelector('#inputInstallmentValue');
    function updateInstallmentValue() {
        const total = parseFloat(totalValueInput.value);
        const n = parseInt(installmentsInput.value);
        if (total && n && n > 0) {
            installmentValueInput.value = (total / n).toFixed(2);
        }
    }
    totalValueInput.addEventListener('input', updateInstallmentValue);
    installmentsInput.addEventListener('input', updateInstallmentValue);
    // Corrigir ano da data
    const dueDateInput = modal.querySelector('#inputDueDate');
    dueDateInput.addEventListener('change', function() {
        let val = dueDateInput.value;
        if (/^\d{2}-\d{2}-\d{2}$/.test(val)) {
            // Se vier no formato yy-mm-dd, corrige para yyyy-mm-dd
            dueDateInput.value = '20' + val;
        }
    });
    modal.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const item = {
            description: formData.get('description'),
            totalValue: parseFloat(formData.get('totalValue')),
            installmentValue: parseFloat(formData.get('installmentValue')) || 0,
            dueDate: formData.get('dueDate'),
            installments: parseInt(formData.get('installments')) || 1,
            paid: false
        };
        state.variableIncome.push(item);
        saveStateToLocalStorage();
        renderVariableIncomeTable();
        updateDashboardUI(getDashboardData());
        renderDashboardExtract();
        modal.remove();
    };
}

function showAddFixedDebtModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Nova Despesa</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="addFixedDebtForm">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Descrição</label>
                        <input type="text" name="description" required>
                    </div>
                    <div class="form-group">
                        <label>Valor</label>
                        <input type="number" name="value" required min="0.01" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Data de Vencimento</label>
                        <input type="date" name="dueDate" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary close-modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => modal.remove();
    });
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    modal.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const item = {
            description: formData.get('description'),
            value: parseFloat(formData.get('value')),
            dueDate: formData.get('dueDate'),
            paid: false
        };
        state.fixedDebts.push(item);
        saveStateToLocalStorage();
        renderFixedDebtsTable();
        updateDashboardUI(getDashboardData());
        renderDashboardExtract();
        modal.remove();
    };
}

function editTransaction(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) return;
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Editar Transação</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="editTransactionForm">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="type" required>
                            <option value="income" ${transaction.type === 'income' ? 'selected' : ''}>Receita</option>
                            <option value="expense" ${transaction.type === 'expense' ? 'selected' : ''}>Despesa</option>
                            <option value="reserve" ${transaction.type === 'reserve' ? 'selected' : ''}>Reserva</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Valor</label>
                        <input type="number" name="amount" required min="0.01" step="0.01" value="${transaction.amount}">
                    </div>
                    <div class="form-group">
                        <label>Descrição</label>
                        <input type="text" name="description" required value="${transaction.description || ''}">
                    </div>
                    <div class="form-group">
                        <label>Categoria</label>
                        <select name="category" required>
                            <option value="">Selecione uma categoria</option>
                            <option value="Rendimento" ${transaction.category === 'Rendimento' ? 'selected' : ''}>Rendimento</option>
                            <option value="Moradia" ${transaction.category === 'Moradia' ? 'selected' : ''}>Moradia</option>
                            <option value="Alimentação" ${transaction.category === 'Alimentação' ? 'selected' : ''}>Alimentação</option>
                            <option value="Serviços" ${transaction.category === 'Serviços' ? 'selected' : ''}>Serviços</option>
                            <option value="Saúde" ${transaction.category === 'Saúde' ? 'selected' : ''}>Saúde</option>
                            <option value="Outros" ${transaction.category === 'Outros' ? 'selected' : ''}>Outros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Data</label>
                        <input type="date" name="date" required value="${transaction.date}">
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary close-modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => modal.remove();
    });
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    modal.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        transaction.type = formData.get('type');
        transaction.amount = parseFloat(formData.get('amount'));
        transaction.description = formData.get('description');
        transaction.category = formData.get('category');
        transaction.date = formData.get('date');
        saveStateToLocalStorage();
        renderTransactions();
        updateDashboardUI(getDashboardData());
        modal.remove();
    };
}

function updateReportsSummary(data) {
    const receitas = document.querySelector('#reportsSection .report-content .text-success');
    const despesas = document.querySelector('#reportsSection .report-content .text-danger');
    const saldo = document.querySelector('#reportsSection .report-content .text-primary');
    if (receitas) receitas.textContent = formatMoney(data.income);
    if (despesas) despesas.textContent = formatMoney(data.expenses);
    if (saldo) saldo.textContent = formatMoney(data.balance);
}