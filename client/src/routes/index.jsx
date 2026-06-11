import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/axios'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { data, isPending, error } = useQuery({
    queryKey: ['health-check'],
    queryFn: async () => {
      const response = await apiClient.get('/health')
      return response.data
    },
  })

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full flex flex-col items-center justify-center">
        <h1 className="text-[2.618rem] leading-tight font-extrabold text-slate-900 mb-4 tracking-tight text-center">
          Welcome!
        </h1>
        <p className="text-[1.618rem] text-slate-500 mb-[2.618rem] text-center font-light">
          React + Tailwind v4 + TanStack Ecosystem
        </p>

        <div className="bg-white p-[2.618rem] rounded-2xl shadow-lg border-t-[6px] border-t-[#E31837] w-full max-w-[38.2rem] text-center transition-all hover:shadow-xl">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-8">
            System Status
          </h2>

          <div className="flex items-center justify-center min-h-16">
            {isPending && (
              <div className="flex items-center gap-3 text-slate-500">
                <div className="w-2.5 h-2.5 bg-[#E31837] rounded-full animate-ping"></div>
                <p className="text-lg font-medium">Pinging server...</p>
              </div>
            )}

            {error && (
              <p className="text-lg text-[#E31837] font-medium bg-red-50 py-2 px-4 rounded-lg">
                Error connecting to server
              </p>
            )}

            {data && (
              <div className="flex items-center justify-center gap-4">
                <span className="relative flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500"></span>
                </span>
                <p className="text-[2rem] font-mono text-slate-800 font-bold tracking-tight">
                  {data.status || 'ONLINE'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
