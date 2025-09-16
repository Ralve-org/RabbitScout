"use client"

import {useState} from "react"
import {Button} from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {getMessages} from "@/lib/utils"
import {MoreHorizontal, Trash} from "lucide-react"

interface MessageOperationsProps {

    message: {
        vhost: string
        queue: string

        payload: string
        payload_bytes: number
        redelivered: boolean
        exchange: string
        routing_key: string
        message_count: number
        properties: {
            headers: Record<string, never>
            delivery_mode: number
            timestamp?: string
            content_type?: string
            content_encoding?: string
            correlation_id?: string
            reply_to?: string
            expiration?: string
            message_id?: string
            type?: string
            user_id?: string
            app_id?: string
            cluster_id?: string
        }
    }
}

export function MessageOperations({message}: MessageOperationsProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [messages, setMessages] = useState<[]>([])
    const [isLoading, setIsLoading] = useState(false)


    const onDelete = async () => {
        try {
            setIsLoading(true)
            // todo delete message
            const fetchedMessages = await getMessages(message.vhost, message.queue, 50, 'ack_requeue_true')
            setMessages(fetchedMessages)
            setDeleteDialogOpen(false)
        } catch (error) {
            console.error("Failed to delete message:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteDialogOpen(true)}
                    >
                        <Trash className="mr-2 h-4 w-4"/>
                        Delete Message
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            This will delete this message from the queue &#34;{message.payload}&#34;. This
                            action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onDelete}
                            disabled={isLoading}
                        >
                            {isLoading ? "Deleting..." : "Delete Message"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
