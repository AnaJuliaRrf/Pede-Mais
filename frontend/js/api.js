const API_URL = 'http://localhost:3000';

function getToken() {
    return localStorage.getItem('token');
}

async function apiRequest(endpoint, method = 'GET', data = null, auth = false) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (auth) {
        headers['Authorization'] = `Bearer ${getToken()}`;
    }

    const options = {
        method,
        headers
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (!response.ok) {
        let message = 'Erro na requisicao';

        try {
            const errorBody = await response.json();
            message = errorBody.error || message;
        } catch (error) {
            message = response.statusText || message;
        }

        throw new Error(message);
    }

    return response.json();
}
