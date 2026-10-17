import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import BankSelectPage from '@/pages/BankSelectPage'
import PracticePage from '@/pages/PracticePage'
import ResultPage from '@/pages/ResultPage'
import WrongBookPage from '@/pages/WrongBookPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BankSelectPage />} />
        <Route path="practice/:sessionId" element={<PracticePage />} />
        <Route path="result/:sessionId" element={<ResultPage />} />
        <Route path="wrongbook" element={<WrongBookPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
