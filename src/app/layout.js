import './globals.css'

export const metadata = {
  title: 'GTM - Global Trade Management | Phlo Systems',
  description: 'The trade intelligence platform for physical commodity trading. Model costs, validate incoterms, calculate customs duty, and track deal profitability.',
  openGraph: {
    title: 'GTM - Global Trade Management',
    description: 'Pre-trade feasibility, cost modelling, customs intelligence, and post-trade analytics for commodity traders.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
