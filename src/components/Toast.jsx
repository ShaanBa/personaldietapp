export default function Toast({ message }) {
  return (
    <div className={`toast-container ${message ? 'visible' : ''}`}>
      {message || ''}
    </div>
  )
}
