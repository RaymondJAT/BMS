import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/funds/revolving')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/funds/revolving"!</div>
}
