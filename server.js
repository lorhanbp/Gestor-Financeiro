const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Mock database
let transactions = [
    { id: 1, description: 'Salário', category: 'Rendimento', date: '2023-05-05', amount: 5000, type: 'income' },
    { id: 2, description: 'Aluguel', category: 'Moradia', date: '2023-05-01', amount: 1500, type: 'expense' },
    { id: 3, description: 'Supermercado', category: 'Alimentação', date: '2023-04-30', amount: 450, type: 'expense' },
    { id: 4, description: 'Freelance', category: 'Rendimento', date: '2023-05-10', amount: 1200, type: 'income' },
    { id: 5, description: 'Internet', category: 'Serviços', date: '2023-05-02', amount: 120, type: 'expense' },
    { id: 6, description: 'Academia', category: 'Saúde', date: '2023-05-03', amount: 150, type: 'expense' },
    { id: 7, description: 'Investimentos', category: 'Rendimento', date: '2023-05-15', amount: 300, type: 'income' }
];

let categories = [
    { id: 1, name: 'Rendimento', type: 'income', color: '#4CAF50', icon: 'money-bill-wave' },
    { id: 2, name: 'Moradia', type: 'expense', color: '#F44336', icon: 'home' },
    { id: 3, name: 'Alimentação', type: 'expense', color: '#FF9800', icon: 'utensils' },
    { id: 4, name: 'Serviços', type: 'expense', color: '#2196F3', icon: 'tools' },
    { id: 5, name: 'Saúde', type: 'expense', color: '#9C27B0', icon: 'heart' }
];

// API Routes
app.get('/api/transactions', (req, res) => {
    res.json(transactions);
});

app.post('/api/transactions', (req, res) => {
    try {
        const { type, amount, description, category, date } = req.body;

        // Validação dos campos
        if (!type || !amount || !description || !category || !date) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        if (type !== 'income' && type !== 'expense') {
            return res.status(400).json({ error: 'Tipo de transação inválido' });
        }

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Valor inválido' });
        }

        const newTransaction = {
            id: transactions.length + 1,
            type,
            amount: parseFloat(amount),
            description,
            category,
            date
        };

        transactions.push(newTransaction);
        res.status(201).json(newTransaction);
    } catch (error) {
        console.error('Erro ao adicionar transação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/transactions/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = transactions.findIndex(t => t.id === id);
    
    if (index !== -1) {
        transactions[index] = { ...transactions[index], ...req.body };
        res.json(transactions[index]);
    } else {
        res.status(404).json({ error: 'Transaction not found' });
    }
});

app.delete('/api/transactions/:id', (req, res) => {
    const id = parseInt(req.params.id);
    transactions = transactions.filter(t => t.id !== id);
    res.status(204).end();
});

// Dashboard data
app.get('/api/dashboard', (req, res) => {
    // Calcula totais
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    // Dados para o gráfico de pizza por categoria
    const categoryData = categories.map(category => {
        const amount = transactions
            .filter(t => t.category === category.name)
            .reduce((sum, t) => sum + t.amount, 0);
        return {
            name: category.name,
            amount: amount,
            color: category.color
        };
    }).filter(item => item.amount > 0); // Remove categorias sem valor

    // Dados para o gráfico de barras horizontais (últimos 6 meses)
    const monthlyData = [
        { month: 'Dez/22', income: 4500, expenses: 3200 },
        { month: 'Jan/23', income: 4800, expenses: 3500 },
        { month: 'Fev/23', income: 5200, expenses: 3800 },
        { month: 'Mar/23', income: 5000, expenses: 4000 },
        { month: 'Abr/23', income: 5500, expenses: 4200 },
        { month: 'Mai/23', income: totalIncome, expenses: totalExpenses }
    ];
    
    res.json({
        balance: totalIncome - totalExpenses,
        income: totalIncome,
        expenses: totalExpenses,
        recentTransactions: transactions.slice(0, 5),
        categoryData: categoryData,
        monthlyData: monthlyData
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 