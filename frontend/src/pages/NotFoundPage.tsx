import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or you don't have access to it."
        action={
          <Button asChild variant="outline">
            <Link to="/">Go to my dashboard</Link>
          </Button>
        }
        className="max-w-md"
      />
    </div>
  )
}
