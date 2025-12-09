import { useState } from 'react'

const ContactForm = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name || !form.email || !form.phone) {
      setError('Completá nombre, email y teléfono para poder contactarte.')
      return
    }
    setError(null)
    setSent(true)
    setTimeout(() => setSent(false), 2000)
  }

  const update = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <form className="panel-card contact-card" onSubmit={handleSubmit}>
      <header className="panel-card__header">
        <div>
          <p className="stand-label">Contactanos</p>
          <p className="stand-title">¿Querés más info antes de reservar?</p>
        </div>
      </header>

      <div className="form-grid">
        <label>
          Nombre*
          <input
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Tu nombre"
          />
        </label>
        <label>
          Email*
          <input
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="contacto@empresa.com"
          />
        </label>
        <label>
          Teléfono*
          <input
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="+54 11 ..."
          />
        </label>
        <label className="full">
          Mensaje
          <textarea
            rows={3}
            value={form.message}
            onChange={(event) => update('message', event.target.value)}
            placeholder="Contanos qué buscás o qué stand te interesa."
          />
        </label>
      </div>

      {error ? <p className="form-feedback">{error}</p> : null}
      {sent ? <p className="form-success">¡Gracias! Te contactaremos en breve.</p> : null}

      <button type="submit" className="primary-btn">
        Enviar contacto
      </button>
    </form>
  )
}

export default ContactForm


