"use client"

import {useEffect, useMemo, useState} from "react"
import {Button} from "@/components/ui/button"
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table"
import {
  ArrowUpDown,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  FileJson,
  Hash,
  InboxIcon,
  MessageSquareOffIcon,
  Settings2,
} from "lucide-react"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {MessageOperations} from "@/components/queues/message-operations";
import {QueueMessage} from "@/lib/queue-message";
import {Queue} from "@/lib/queue";



interface MessageViewerProps {
  messages: QueueMessage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queueList: Queue[];
  queueInfo: { messages_ready: number; messages_unacknowledged: number, queue: string, vhost: string };
  messageRefresh: () => void;
}

type SortableField = "routing_key" | "payload_bytes" | "redelivered"

export function MessageViewer({messageRefresh, messages, open, onOpenChange, queueList, queueInfo}: Readonly<MessageViewerProps>) {
  const [selectedMessage, setSelectedMessage] = useState<QueueMessage | null>(null)
  const [sortField, setSortField] = useState<SortableField>("routing_key")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [isCopied, setIsCopied] = useState(false)
  const [messagesPerPage, setMessagesPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [paginatedMessages, setPaginatedMessages] = useState<QueueMessage[]>([])

  useEffect(() => {
    setSelectedMessage(null);
    setIsCopied(false);

    const totalPages = Math.ceil(messages.length / messagesPerPage);
    setTotalPages(totalPages);

    const paginatedMessages = messages.slice(
        (currentPage - 1) * messagesPerPage,
        currentPage * messagesPerPage
    );
    setPaginatedMessages(paginatedMessages);

    if(totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [messages, currentPage, messagesPerPage])

  const formatPayload = (payload: string) => {
    try {
      const parsed = JSON.parse(payload)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return payload
    }
  }

  const sortMessages = (field: SortableField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const sortedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return []

    return [...messages].sort((a, b) => {
      if (sortField === "routing_key") {
        const aValue = a.routing_key || ""
        const bValue = b.routing_key || ""
        return sortOrder === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
      }

      if (sortField === "payload_bytes") {
        const aValue = a.payload_bytes || 0
        const bValue = b.payload_bytes || 0
        return sortOrder === "asc"
            ? aValue - bValue
            : bValue - aValue
      }

      if (sortField === "redelivered") {
        const aValue = a.redelivered ? 1 : 0
        const bValue = b.redelivered ? 1 : 0
        return sortOrder === "asc"
            ? aValue - bValue
            : bValue - aValue
      }

      return 0
    })
  }, [messages, sortField, sortOrder])


  const getQueueStatusDescription = () => {
    if (!queueInfo) return null;

    const {messages_unacknowledged} = queueInfo;
    const hasViewableMessages = messages.length > 0;
    const hasUnackedMessages = messages_unacknowledged > 0;

    if (!hasViewableMessages && !hasUnackedMessages) {
      return "No messages found in this queue";
    }

    const parts = [];
    if (hasViewableMessages) {
      parts.push(`Viewing ${messages.length} available message${messages.length === 1 ? '' : 's'}`);
    }
    if (hasUnackedMessages) {
      parts.push(`${messages_unacknowledged} message${messages_unacknowledged === 1 ? ' is' : 's are'} being processed by consumers`);
    }

    return parts.join(' • ');
  }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Queue Messages</DialogTitle>
            <DialogDescription className="text-sm">
              {getQueueStatusDescription()}
            </DialogDescription>
            {queueInfo && (queueInfo.messages_ready > 0 || queueInfo.messages_unacknowledged > 0) && (
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  {queueInfo.messages_ready > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"/>
                        <span>{queueInfo.messages_ready} ready</span>
                      </div>
                  )}
                  {queueInfo.messages_unacknowledged > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"/>
                        <span>{queueInfo.messages_unacknowledged} processing</span>
                      </div>
                  )}
                </div>
            )}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
            <div className="border rounded-lg overflow-auto flex flex-col">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[40%]">
                      <Button
                          variant="ghost"
                          onClick={() => sortMessages("routing_key")}
                          className="w-full justify-center font-semibold hover:bg-muted"
                      >
                        Routing Key
                        <ArrowUpDown className={sortField === "routing_key" ? "opacity-100" : "opacity-0"}/>
                      </Button>
                    </TableHead>
                    <TableHead className="w-[30%]">
                      <Button
                          variant="ghost"
                          onClick={() => sortMessages("payload_bytes")}
                          className="w-full justify-center font-semibold hover:bg-muted"
                      >
                        Size
                        <ArrowUpDown className={sortField === "payload_bytes" ? "opacity-100" : "opacity-0"}/>
                      </Button>
                    </TableHead>
                    <TableHead className="w-[30%]">
                      <Button
                          variant="ghost"
                          onClick={() => sortMessages("redelivered")}
                          className="w-full justify-center font-semibold hover:bg-muted"
                      >
                        Redelivered
                        <ArrowUpDown className={sortField === "redelivered" ? "opacity-100" : "opacity-0"}/>
                      </Button>
                    </TableHead>
                    <TableHead className="w-[30%]">
                      actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMessages.length > 0 ? (
                      paginatedMessages.map((message, index) => (
                          <TableRow
                              key={index}
                              className={
                                selectedMessage === message
                                    ? "bg-muted cursor-pointer"
                                    : "cursor-pointer hover:bg-muted"
                              }
                              onClick={() => setSelectedMessage(message)}
                          >
                            <TableCell className="font-medium text-center">
                              {message.routing_key || "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {message.payload_bytes} bytes
                            </TableCell>
                            <TableCell className="text-center">
                              {message.redelivered ? (
                                  <span className="text-yellow-600">Yes</span>
                              ) : (
                                  <span className="text-green-600">No</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <MessageOperations
                                  queueList={queueList}
                                  messageRefresh={messageRefresh}
                                  message={{...message, vhost: queueInfo.vhost, queue: queueInfo.queue}}></MessageOperations>
                            </TableCell>
                          </TableRow>
                      ))
                  ) : (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3 p-4 w-full">
                            <InboxIcon className="h-12 w-12 shrink-0"/>
                            <div className="text-base font-medium text-center">No messages available for viewing</div>
                            {queueInfo?.messages_unacknowledged ? (
                                <div className="text-sm text-center break-normal whitespace-pre-line">
                                  {queueInfo.messages_unacknowledged === 1
                                      ? "There is 1 message in the queue,\nbut it's currently being processed\nby consumers and cannot be viewed."
                                      : `There are ${queueInfo.messages_unacknowledged} messages in the queue,\nbut they're currently being processed\nby consumers and cannot be viewed.`}
                                </div>
                            ) : (
                                <div className="text-sm text-center">This queue is currently empty</div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
              {paginatedMessages.length > 0 && (
                  <div className="mt-auto border-t p-2 flex items-center justify-between bg-background">
                    <div className="flex items-center gap-4">
                      <Select
                          value={messagesPerPage.toString()}
                          onValueChange={(value) => {
                            setMessagesPerPage(Number(value));
                            setCurrentPage(1);
                          }}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue placeholder="Messages per page"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 per page</SelectItem>
                          <SelectItem value="50">50 per page</SelectItem>
                          <SelectItem value="100">100 per page</SelectItem>
                          <SelectItem value="500">500 per page</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * messagesPerPage) + 1} to {Math.min(currentPage * messagesPerPage, sortedMessages.length)} of {sortedMessages.length} messages
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4"/>
                      </Button>
                      <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4"/>
                      </Button>
                      <div className="flex items-center gap-1 px-2">
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={currentPage}
                            onChange={(e) => {
                              const page = parseInt(e.target.value);
                              if (page >= 1 && page <= totalPages) {
                                setCurrentPage(page);
                              }
                            }}
                            className="w-12 h-8 rounded-md border border-input bg-background px-2 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-xs text-muted-foreground">of {totalPages}</span>
                      </div>
                      <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4"/>
                      </Button>
                      <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4"/>
                      </Button>
                    </div>
                  </div>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden flex flex-col">
              {selectedMessage ? (
                  <div className="flex flex-col h-full">
                    <div className="p-2 border-b bg-muted/30">
                      <h4 className="font-medium text-sm">Message Details</h4>
                      <div className="text-xs text-muted-foreground">
                        Select different sections below to view message information
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                      <div className="space-y-3 h-full flex flex-col">
                        <div>
                          <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1">
                            <Hash className="h-3.5 w-3.5"/>
                            Headers
                          </h4>
                          <div className="relative">
                        <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-[80px] subpixel-antialiased">
                          {JSON.stringify(selectedMessage.properties.headers || {}, null, 2)}
                        </pre>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1">
                            <Settings2 className="h-3.5 w-3.5"/>
                            Properties
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs bg-muted/50 p-2 rounded">
                            {Object.entries(selectedMessage.properties)
                            .filter(([key]) => key !== "headers")
                            .map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium">{key}:</span>{" "}
                                  {value?.toString() || "N/A"}
                                </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col min-h-0">
                          <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1">
                            <FileJson className="h-3.5 w-3.5"/>
                            Payload
                          </h4>
                          <div className="relative flex-1">
                        <pre
                            className="text-sm bg-muted/50 p-4 rounded overflow-auto absolute inset-0 font-mono text-foreground/90 subpixel-antialiased [font-feature-settings:'mono'] tracking-tight">
                          {formatPayload(selectedMessage.payload)}
                        </pre>
                            <Button
                                variant="outline"
                                size="sm"
                                className="absolute top-2 right-4"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedMessage.payload);
                                  setIsCopied(true);
                                  setTimeout(() => setIsCopied(false), 2000);
                                }}
                            >
                              {isCopied ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1 text-green-500"/>
                                    Copied
                                  </>
                              ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-1"/>
                                    Copy
                                  </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 p-6">
                    <MessageSquareOffIcon className="h-12 w-12"/>
                    <div className="text-base font-medium">No message selected</div>
                    <div className="text-sm text-center">
                      {messages.length > 0
                          ? "Select a message from the table to view its details"
                          : "Messages will appear here once they are available in the queue"}
                    </div>
                  </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
  )
}
