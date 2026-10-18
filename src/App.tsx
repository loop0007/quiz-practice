import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import BankDetailPage from '@/pages/BankDetailPage'
import BankSelectPage from '@/pages/BankSelectPage'
import FavoritesPage from '@/pages/FavoritesPage'
import HistoryPage from '@/pages/HistoryPage'
import HomePage from '@/pages/HomePage'
import PracticePage from '@/pages/PracticePage'
import ResultPage from '@/pages/ResultPage'
import WrongBookPage from '@/pages/WrongBookPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="banks" element={<BankSelectPage />} />
        <Route path="banks/:bankId" element={<BankDetailPage />} />
        <Route path="practice/:sessionId" element={<PracticePage />} />
        <Route path="result/:sessionId" element={<ResultPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="wrongbook" element={<WrongBookPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
