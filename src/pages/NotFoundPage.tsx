import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-2xl font-bold">页面不存在</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">检查一下地址，或者回到首页。</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        回到首页
      </Link>
    </section>
  )
}
