/**
 * js/produto_detalhe.js - O Motor de Busca de Detalhes
 * Conectado ao Neon + Render
 */

// 1. CONFIGURAÇÃO DE ENDEREÇO DA API
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000" 
    : "https://regia-tinas.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    console.log("🔍 Iniciando busca de detalhes do produto...");
    carregarDetalhesProduto();
});

async function carregarDetalhesProduto() {
    // 2. Captura o ID da URL (?id=...)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    const loadingSection = document.getElementById('loading-product');
    const notFoundSection = document.getElementById('product-not-found');
    const dataSection = document.getElementById('product-data');

    if (!productId) {
        exibirErro();
        return;
    }

    try {
        // 3. Busca a lista do banco
        const response = await fetch(`${API_BASE_URL}/api/produtos`);
        
        if (!response.ok) throw new Error("Falha na conexão com o banco Neon.");

        const produtos = await response.json();

        // 4. Localiza o produto específico
        const produto = produtos.find(p => (p.id_produto || p.id) == productId);

        if (loadingSection) loadingSection.style.display = 'none';

        if (produto) {
            preencherTela(produto);
            if (dataSection) dataSection.style.display = 'flex';
        } else {
            exibirErro();
        }

    } catch (error) {
        console.error("❌ Erro:", error);
        exibirErro("Erro ao conectar com o servidor. Verifique sua internet.");
    }
}

// --- FUNÇÃO: PREENCHER DADOS NA TELA ---
function preencherTela(p) {
    // Texto e Badges
    const badge = document.getElementById('product-id-badge');
    const name = document.getElementById('product-name');
    const brand = document.getElementById('product-brand');
    const price = document.getElementById('product-price');
    const desc = document.getElementById('product-description');
    const img = document.getElementById('product-image');

    if (badge) badge.textContent = p.id_produto || p.id;
    if (name) name.textContent = p.nome_produto || 'Produto sem nome';
    if (brand) brand.textContent = p.marca || 'Regia & Tinas Care';
    
    // Preço Formatado (R$)
    const valor = parseFloat(p.preco_promocional || p.preco || 0);
    if (price) price.textContent = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    if (desc) desc.textContent = p.descricao || 'Este produto não possui descrição detalhada.';

    // Lógica de Imagem
    if (img) {
        let urlFinal = p.url_imagem;
        // Se for um caminho relativo, ajusta para a pasta img/
        if (urlFinal && !urlFinal.startsWith('http')) {
            urlFinal = `img/${urlFinal}`;
        }
        img.src = urlFinal || 'img/logo_pequena4.png';
        img.alt = p.nome_produto;
    }

    // Configura o botão de compra (Opcional: se quiser salvar no carrinho)
    const btnCompra = document.querySelector('.btn-brand.btn-lg');
    if (btnCompra) {
        btnCompra.onclick = () => {
            adicionarAoCarrinhoLocal(p);
        };
    }
}

// --- FUNÇÃO: CARRINHO (LOCALSTORAGE) ---
function adicionarAoCarrinhoLocal(p) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho_regia')) || [];
    const itemExistente = carrinho.find(item => item.id == (p.id_produto || p.id));

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({
            id: p.id_produto || p.id,
            nome: p.nome_produto,
            preco: p.preco_promocional || p.preco,
            imagem: p.url_imagem,
            quantidade: 1
        });
    }

    localStorage.setItem('carrinho_regia', JSON.stringify(carrinho));
    alert(`🛒 ${p.nome_produto} adicionado ao seu carrinho!`);
}

function exibirErro(msg) {
    const loading = document.getElementById('loading-product');
    const error = document.getElementById('product-not-found');
    if (loading) loading.style.display = 'none';
    if (error) {
        error.style.display = 'block';
        if (msg) error.querySelector('p').textContent = msg;
    }
}