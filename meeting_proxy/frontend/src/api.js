import axios from 'axios'

// Shared axios instance so every request sends Flask session cookies.
const api = axios.create({
  withCredentials: true,
})

export default api
