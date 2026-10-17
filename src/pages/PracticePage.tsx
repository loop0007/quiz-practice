import { useParams } from 'react-router-dom'

export default function PracticePage() {
  const { sessionId } = useParams()
  return (
    <section>
      <h1 className="text-2xl font-bold">答题页</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">会话：{sessionId}</p>
    </section>
  )
}
