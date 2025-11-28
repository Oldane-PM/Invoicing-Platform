export interface InvoiceItem {
  description: string
  hours: number
  rate: number
  amount: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  from: {
    name: string
    address: string
    state: string
    country: string
    email: string
  }
  billTo: {
    company: string
    address: string
  }
  items: InvoiceItem[]
  total: number
  banking: {
    bankName: string
    bankAddress: string
    swiftCode: string
    abaWireRouting: string
    accountType: string
    currency: string
    accountNumber: string
  }
  submissionId?: string
}

