import { http, HttpResponse } from 'msw'
import { currentUser, unauthorized } from '../http'

export const authHandlers = [
  http.get('/api/me', ({ request }) => {
    const user = currentUser(request)
    return user ? HttpResponse.json(user) : unauthorized()
  }),
]
