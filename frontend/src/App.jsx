import React, { useState } from 'react';
import { RefreshCcw, DollarSign, XCircle, CheckCircle, Clock, Users } from 'lucide-react';

// Estilização com Tailwind CSS
const App = () => {
  const [steamIds, setSteamIds] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Função para lidar com a busca de valor de inventário (Rota: /api/process)
  const handleProcessInventory = async () => {
    setError(null);
    setIsLoading(true);
    setResults([]);

    if (!steamIds.trim()) {
      setError('Por favor, insira pelo menos uma Steam ID para calcular o valor.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steamIds }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Ocorreu um erro desconhecido ao processar o valor.');
        setResults([]);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError('Erro de conexão com o servidor. Verifique se o backend está rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  // Componente de resultado de valor de inventário
  const ValueResult = ({ item }) => {
    const isSuccess = item.status === 'OK';
    const isPrivate = item.status.includes('private');
    const isRateLimited = item.status.includes('Rate Limit');
    const isDnsError = item.status.includes('Montuga API: Erro de DNS');

    return (
      <div className={`p-4 rounded-xl shadow-md transition duration-300 ${
        isSuccess ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
      }`}>
        <div className="font-semibold text-lg text-gray-700 break-all mb-1">
          ID: {item.steamId}
        </div>
        <div className="flex items-center space-x-2">
          {isSuccess ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : isPrivate ? (
            <Users className="w-5 h-5 text-yellow-600" />
          ) : isRateLimited ? (
             <Clock className="w-5 h-5 text-blue-600" />
          ) : isDnsError ? (
             <XCircle className="w-5 h-5 text-orange-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span className="text-gray-900 font-bold">
            Valor: {item.value === 'N/A' ? 'Não Disponível' : `R$ ${item.value}`}
          </span>
        </div>
        {!isSuccess && (
          <p className="text-sm text-gray-600 mt-2">
            Status: {item.status.length > 50 ? item.status.substring(0, 50) + '...' : item.status}
          </p>
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 md:p-10">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Steam Tool
          </h1>
          <p className="text-gray-600">
            Análise de Valor de Inventário (Montuga API).
          </p>
        </header>

        {/* --- Área de Erro Global --- */}
        {error && (
          <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg mb-6 flex items-center space-x-3">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* --- Conteúdo Principal: Valor de Inventário --- */}
        <div>
            <p className="text-gray-700 mb-4">
              Insira uma ou mais Steam IDs (separadas por vírgula ou espaço) para verificar o valor do inventário.
            </p>
            <textarea
              className="w-full p-4 h-32 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono text-sm"
              placeholder="Ex: 76561198000000001, 76561198000000002"
              value={steamIds}
              onChange={(e) => setSteamIds(e.target.value)}
              disabled={isLoading}
            />
            <button
              onClick={handleProcessInventory}
              disabled={isLoading}
              className={`mt-4 w-full flex justify-center items-center space-x-3 py-3 px-6 border border-transparent text-lg font-semibold rounded-xl shadow-lg transition duration-300 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white transform hover:scale-[1.01]'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  <span>Analisando... (Aguarde o Rate Limit)</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-6 h-6" />
                  <span>Calcular Valor</span>
                </>
              )}
            </button>

            {/* Resultados do Inventário */}
            {results.length > 0 && (
              <div className="mt-8 space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Resultados da Análise</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {results.map((item, index) => (
                    <ValueResult key={index} item={item} />
                  ))}
                </div>
                <p className="text-sm text-gray-600 pt-2">
                    <Clock className="w-4 h-4 inline mr-1 align-sub text-blue-500" />
                    O Rate Limit de 50 RPM (1.2s/ID) foi aplicado durante o processamento.
                </p>
              </div>
            )}
          </div>

      </div>
    </div>
  );
};

export default App;
