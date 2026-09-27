import { redirect } from 'next/navigation'

// /roster on its own means "the roster", which `/` knows how to pick
export default function RosterIndex() {
  redirect('/')
}
