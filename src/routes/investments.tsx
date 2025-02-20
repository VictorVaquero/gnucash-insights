import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/investments')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/investments"!</div>
}
