// api.js
import API_BASE_URL from './config';

export const apiCall = async (method, endpoint, data = null, needsAuth = false) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (needsAuth) {
    const token = localStorage.getItem('token');
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (data) options.body = JSON.stringify(data);
  
  const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
  return res.json();
};

// Usar assim:
export const login = (email, senha) => 
  apiCall('POST', '/auth/login', { email, senha });

export const getPedidos = (empresaId) => 
  apiCall('GET', `/empresas/${empresaId}/pedidos`, null, true);