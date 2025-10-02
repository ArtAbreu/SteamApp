import express from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente do .env
dotenv.config();

// Resolve o erro de caminho com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONTUGA_API_KEY = process.env.MONTUGA_API_KEY;
const STEAM_API_KEY = process.env.STEAM_API_KEY;

// --- Configuração do Rate Limit (50 RPM = 1200ms entre requisições por IP) ---
const RATE_LIMIT_MS = 1200; // 1200ms = 1.2s entre requisições
console.log(`[SETUP] Rate Limit Montuga configurado para 50 RPM (${RATE_LIMIT_MS}ms por ID processado).`);

// Middleware para analisar corpos JSON
app.use(express.json());

// Servir arquivos estáticos do frontend (pasta dist)
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
app.use(express.static(path.join(__dirname, 'dist'))); // Suporte para pasta 'dist' na raiz

// Middleware para Home Page (para lidar com o roteamento do React)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// =========================================================================
// ROTA 1: PROCESSAMENTO DE INVENTÁRIO (Com Rate Limit)
// =========================================================================

app.post('/api/process', async (req, res) => {
    const steamIdsText = req.body.steamIds;
    if (!steamIdsText) {
        return res.status(400).json({ error: 'Nenhuma Steam ID fornecida.' });
    }

    const steamIds = steamIdsText.split(/[\s,]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0);

    if (steamIds.length === 0) {
        return res.status(400).json({ error: 'Nenhuma Steam ID válida fornecida.' });
    }

    const results = [];
    const montugaUrl = 'https://montuga.xyz/api/v1/profile/value';

    for (const steamId of steamIds) {
        console.log(`[ID ${steamId}] Processando...`);

        try {
            const response = await axios.post(montugaUrl, {
                steamId: steamId
            }, {
                headers: {
                    'Authorization': MONTUGA_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const value = response.data?.value_real_brl || 'N/A';
            const status = response.data?.status || 'OK';

            results.push({ steamId, value, status });

        } catch (error) {
            const statusText = error.response?.data?.status || 'Erro de Conexão/API';
            const message = error.message;

            results.push({ steamId, value: 'N/A', status: statusText });

            console.error(`[ID ${steamId}] Falha Montuga: ${statusText} (${message})`);
        }

        // Aplicar Rate Limit após cada requisição
        if (steamIds.length > 1) {
            console.log(`[ID ${steamId}] Aguardando ${RATE_LIMIT_MS}ms (Rate Limit)...`);
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
        }
    }

    res.json(results);
});

// =========================================================================
// ROTA 2: BUSCA DE AMIGOS (Nova Rota)
// =========================================================================

app.post('/api/getfriends', async (req, res) => {
    const { steamId } = req.body;

    if (!steamId) {
        return res.status(400).json({ error: 'Steam ID de origem não fornecida.' });
    }

    if (!STEAM_API_KEY) {
        console.error('STEAM_API_KEY não configurada. A rota /getfriends requer a chave da Steam.');
        return res.status(500).json({ error: 'Chave da Steam API não configurada no servidor.' });
    }

    console.log(`[GET FRIENDS] Buscando amigos para o ID ${steamId}...`);

    try {
        // Endpoint da Steam para obter lista de amigos
        const response = await axios.get('https://api.steampowered.com/ISteamUser/GetFriendList/v1/', {
            params: {
                key: STEAM_API_KEY,
                steamid: steamId,
                relationship: 'friend',
            },
        });

        const friends = response.data.friendslist?.friends || [];
        const friendIds = friends.map(friend => friend.steamid);

        res.json({ steamId, friends: friendIds });

    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data || error.message;
        
        console.error(`[GET FRIENDS] Erro ao buscar amigos do Steam ID ${steamId}: ${message}`);
        return res.status(status).json({ 
            error: 'Erro ao buscar lista de amigos. Verifique se o perfil e a lista de amigos são públicos.',
            details: message 
        });
    }
});


// =========================================================================
// INICIALIZAÇÃO
// =========================================================================

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
