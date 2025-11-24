import React, { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  IconButton,
  Input,
  FormControl,
  FormLabel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Card,
  CardBody,
  VStack,
  HStack,
  Badge,
} from "@chakra-ui/react"
import { ChevronLeftIcon, DeleteIcon, DownloadIcon } from "@chakra-ui/icons"
import { getDay, getSet, addWordToSet, removeWord, toTRDate } from "../lib/storage"
// @ts-ignore
import html2pdf from "html2pdf.js/dist/html2pdf.bundle.min"
import type { Day, Set, Word } from "../lib/storage"
import ConfirmDialog from "../components/ConfirmDialog"
import EmptyState from "../components/EmptyState"

export default function SetScreen() {
  const { dayId, setId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [day, setDay] = useState<Day | undefined>(undefined)
  const [setItem, setSetItem] = useState<Set | undefined>(undefined)
  const [words, setWords] = useState<Word[]>([])

  const [eng, setEng] = useState("")
  const [synonym, setSynonym] = useState("")
  const [tr, setTr] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!dayId || !setId) return
    const d = getDay(dayId)
    const s = getSet(dayId, setId)
    setDay(d as any)
    setSetItem(s as any)
    setWords(s?.words || [])
  }, [dayId, setId])

  const handleAddWord = () => {
    if (!dayId || !setId) return
    if (!eng.trim() || !tr.trim()) {
      toast({ title: "Lütfen İngilizce ve Türkçe alanlarını doldurun", status: "warning" })
      return
    }
    try {
      addWordToSet(dayId, setId, { eng: eng.trim(), tr: tr.trim(), synonym: synonym.trim() || undefined })
      const s = getSet(dayId, setId)
      setWords(s?.words || [])
      setEng("")
      setSynonym("")
      setTr("")
      toast({ title: "Kelime eklendi", status: "success" })
    } catch (e) {
      toast({ title: "Ekleme başarısız", description: String(e), status: "error" })
    }
  }

  const handleRemoveWord = () => {
    if (!dayId || !setId || !deleteId) return
    try {
      removeWord(dayId, setId, deleteId)
      const s = getSet(dayId, setId)
      setWords(s?.words || [])
      setDeleteId(null)
      toast({ title: "Kelime silindi", status: "info" })
    } catch (e) {
      toast({ title: "Silme başarısız", description: String(e), status: "error" })
    }
  }

  async function exportFlashCardPDF() {
    if (!setItem) return
    setIsExporting(true)
    try {
      const nowStr = toTRDate(new Date())
      const slugify = (s: string) => s
        .normalize('NFD')
        .replace(/[ - ]/g, (c) => c)
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]+/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase()
      const filename = `flashcards_${slugify(setItem.name)}_${nowStr}.pdf`

      const css = `
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        #pdf-root { 
          font-family: Inter, system-ui, sans-serif; 
          background: #fff; 
          width: 210mm;
          margin: 0;
          padding: 0;
        }
        .page {
          width: 210mm;
          height: 296mm; /* Slightly less than 297mm to prevent overflow */
          padding: 10mm;
          page-break-after: always;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(4, 1fr);
          gap: 0;
        }
        .page:last-child { page-break-after: auto; }
        .card {
          border: 1px dashed #999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          text-align: center;
          height: 100%;
          width: 100%;
          overflow: visible;
          position: relative;
        }
        .card::before {
          content: '✂';
          position: absolute;
          top: -9px;
          left: -9px;
          width: 14px;
          height: 14px;
          font-size: 10px;
          line-height: 14px;
          color: #999;
          background: #fff;
          z-index: 1;
        }
        .card-content {
          width: 100%;
          font-weight: 700;
          color: #000;
          word-wrap: break-word;
          line-height: 1.2;
        }
        /* Dynamic font sizing based on length */
        .text-lg { font-size: 22pt; }
        .text-md { font-size: 16pt; }
        .text-sm { font-size: 12pt; }
        .text-xs { font-size: 10pt; }
        
        .meta {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 8px;
          color: #ccc;
          font-weight: normal;
        }
      `

      // Helper to determine font size class
      const getSizeClass = (text: string) => {
        if (!text) return 'text-lg'
        if (text.length < 10) return 'text-lg'
        if (text.length < 25) return 'text-md'
        if (text.length < 60) return 'text-sm'
        return 'text-xs'
      }

      // Chunk words into groups of 12
      const chunkSize = 12
      const chunks = []
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize))
      }

      let pagesHtml = ''

      chunks.forEach((chunk, pageIndex) => {
        // --- FRONT PAGE (English) ---
        // Normal order: 1, 2, 3...
        let frontCardsHtml = ''
        // Fill up to 12 slots (empty if less)
        for (let i = 0; i < 12; i++) {
          const word = chunk[i]
          if (word) {
            frontCardsHtml += `
              <div class="card">
                <div class="card-content ${getSizeClass(word.eng)}">${word.eng}</div>
                <div class="meta">${pageIndex + 1}-F-${i + 1}</div>
              </div>`
          } else {
            frontCardsHtml += `<div class="card"></div>`
          }
        }
        pagesHtml += `<div class="page">${frontCardsHtml}</div>`

        // --- BACK PAGE (Turkish) ---
        // Mirrored rows for double-sided printing
        // Row 1 (0,1,2) -> becomes (2,1,0)
        // Row 2 (3,4,5) -> becomes (5,4,3)
        // ...
        let backCardsHtml = ''
        const rowSize = 3
        const rows = []
        // Create 4 rows of 3 items
        for (let r = 0; r < 4; r++) {
          const rowItems = []
          for (let c = 0; c < 3; c++) {
            const index = r * 3 + c
            rowItems.push(chunk[index]) // could be undefined
          }
          // Reverse the row for mirroring
          rows.push(rowItems.reverse())
        }

        // Flatten rows back to single list
        const mirroredChunk = rows.flat()

        mirroredChunk.forEach((word, i) => {
          if (word) {
            backCardsHtml += `
              <div class="card">
                <div class="card-content ${getSizeClass(word.tr)}">${word.tr}</div>
                 <div class="meta">${pageIndex + 1}-B-${i + 1}</div>
              </div>`
          } else {
            backCardsHtml += `<div class="card"></div>`
          }
        })
        pagesHtml += `<div class="page">${backCardsHtml}</div>`
      })

      const html = `
        <div id="pdf-root">
          <style>${css}</style>
          ${pagesHtml}
        </div>
      `

      const container = document.createElement('div')
      container.innerHTML = html
      document.body.appendChild(container)

      const opt = {
        margin: 0,
        filename,
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: false },
        pagebreak: { mode: ['css'] },
      }

      await html2pdf()
        .from(container.querySelector('#pdf-root') as HTMLElement)
        .set(opt)
        .toPdf()
        .save()

      document.body.removeChild(container)
      toast({ title: 'Flash Kart PDF indirildi', status: 'success' })
    } catch (e) {
      console.error(e)
      toast({ title: 'PDF oluşturma hatası', description: String(e), status: 'error' })
    } finally {
      setIsExporting(false)
    }
  }

  async function exportPDF() {
    if (!setItem) return
    setIsExporting(true)
    try {
      const nowStr = toTRDate(new Date())
      const slugify = (s: string) => s
        .normalize('NFD')
        .replace(/[ - ]/g, (c) => c)
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]+/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase()
      const filename = `${slugify(setItem.name)}_${slugify(day?.name || '')}_${nowStr}.pdf`

      const year = new Date().getFullYear()
      const css = `
        * { -webkit-font-smoothing: none; text-rendering: geometricPrecision; }
        #pdf-root { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111; background:#fff; padding: 20mm; }
        table.word-table { width: 100%; border-collapse: collapse; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; vertical-align: middle; }
        td { word-break: break-word; white-space: normal; }
        thead .title-row th { font-size: 16pt; font-weight: 700; text-align: center; border: none; padding: 8px 0; }
        thead .date-row th { font-size: 10pt; color: #888; text-align: right; border: none; padding: 0 4px 8px 4px; }
        thead .columns-row th { background: #f2f2f2; font-weight: 700; font-size: 12pt; }
        tbody td { background: #ffffff; font-size: 12pt; }
        tfoot .footer-row td { border: none; text-align: center; color: #777; font-size: 8pt; padding-top: 8px; }
      `

      const rowsHtml = words.map((w, i) => (
        `<tr>
          <td>${i + 1}</td>
          <td>${w.eng}</td>
          <td>${w.synonym || ''}</td>
          <td>${w.tr}</td>
        </tr>`
      )).join('')

      const html = `
        <div id="pdf-root">
          <style>${css}</style>
          <table class="word-table">
            <thead>
              <tr class="title-row"><th colspan="4">${setItem.name} — ${day?.name || ''}</th></tr>
              <tr class="date-row"><th colspan="4">${nowStr}</th></tr>
              <tr class="columns-row">
                <th>#</th>
                <th>İngilizce</th>
                <th>Eş Anlam</th>
                <th>Türkçe</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr class="footer-row"><td colspan="4">Kelime Defterim — © ${year}</td></tr>
            </tfoot>
          </table>
        </div>
      `

      const container = document.createElement('div')
      container.innerHTML = html
      document.body.appendChild(container)

      const opt = {
        margin: 0,
        filename,
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: false },
        pagebreak: { mode: ['css', 'legacy'] },
      }

      await html2pdf()
        .from(container.querySelector('#pdf-root') as HTMLElement)
        .set(opt)
        .toPdf()
        .get('pdf')
        .then((pdf: any) => {
          pdf.setFont('helvetica', 'normal')
        })
        .save()
      document.body.removeChild(container)
      toast({ title: 'PDF başarıyla indirildi', status: 'success' })
    } catch (e) {
      toast({ title: 'PDF oluşturma başarısız', description: String(e), status: 'error' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Box
      minH="100vh"
      w="100%"
      p={{ base: 4, md: 8 }}
      pt={{ base: 8, md: 12 }}
    >
      <Flex direction="column" align="center" justify="flex-start" w="100%" gap={8}>
        {/* Header */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align="center"
          w="100%"
          maxW="1000px"
          gap={{ base: 4, md: 3 }}
        >
          <Button
            leftIcon={<ChevronLeftIcon />}
            variant="ghost"
            onClick={() => navigate(`/day/${dayId}`)}
            color="deepSea.lavenderGrey"
            _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
            alignSelf={{ base: 'flex-start', md: 'auto' }}
          >
            Geri Dön
          </Button>
          <VStack spacing={0} mb={{ base: 2, md: 0 }}>
            <Heading size="lg" bgGradient="linear(to-r, deepSea.duskBlue, deepSea.lavenderGrey)" bgClip="text" textAlign="center">
              {setItem?.name || "Set"}
            </Heading>
            <Text fontSize="sm" color="deepSea.lavenderGrey">
              {day?.name || ""}
            </Text>
          </VStack>
          <HStack spacing={2}>
            <Button
              leftIcon={<DownloadIcon />}
              onClick={exportPDF}
              isLoading={isExporting}
              loadingText="Tablo"
              variant="outline"
              size="sm"
            >
              Tablo PDF
            </Button>
            <Button
              leftIcon={<DownloadIcon />}
              onClick={exportFlashCardPDF}
              isLoading={isExporting}
              loadingText="Kartlar"
              variant="solid"
              colorScheme="blue"
              size="sm"
            >
              Flash Kart PDF
            </Button>
          </HStack>
        </Flex>

        {/* Add Word Form */}
        <Card w="100%" maxW="1000px" variant="elevated">
          <CardBody>
            <Flex wrap="wrap" justify="center" gap={4} align="flex-end">
              <FormControl flex="1" minW={{ base: "100%", sm: "200px" }}>
                <FormLabel>İngilizce</FormLabel>
                <Input
                  value={eng}
                  onChange={(e) => setEng(e.target.value)}
                  placeholder="run"
                  size="lg"
                />
              </FormControl>
              <FormControl flex="1" minW={{ base: "100%", sm: "200px" }}>
                <FormLabel>Eş Anlam (Opsiyonel)</FormLabel>
                <Input
                  value={synonym}
                  onChange={(e) => setSynonym(e.target.value)}
                  placeholder="jog"
                  size="lg"
                />
              </FormControl>
              <FormControl flex="1" minW={{ base: "100%", sm: "200px" }}>
                <FormLabel>Türkçe</FormLabel>
                <Input
                  value={tr}
                  onChange={(e) => setTr(e.target.value)}
                  placeholder="koşmak"
                  size="lg"
                />
              </FormControl>
              <Button
                variant="solid"
                size="lg"
                onClick={handleAddWord}
                px={8}
                w={{ base: "100%", md: "auto" }}
              >
                Ekle
              </Button>
            </Flex>
          </CardBody>
        </Card>

        {/* Word List */}
        <Box w="100%" maxW="1000px">
          <HStack justify="space-between" mb={4} px={2}>
            <Heading size="md" color="deepSea.alabasterGrey">Kelimeler</Heading>
            <Badge bg="deepSea.duskBlue" color="white" fontSize="md" borderRadius="md" px={2}>
              {words.length}
            </Badge>
          </HStack>

          {words.length === 0 ? (
            <EmptyState
              title="Henüz kelime eklenmemiş"
              description="Yukarıdaki formu kullanarak bu sete kelime ekleyebilirsin."
            />
          ) : (
            <Card variant="outline" bg="rgba(27, 38, 59, 0.2)" borderColor="whiteAlpha.100">
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th color="deepSea.lavenderGrey" w="50px">#</Th>
                      <Th color="deepSea.lavenderGrey">İngilizce</Th>
                      <Th color="deepSea.lavenderGrey" display={{ base: "none", sm: "table-cell" }}>Eş Anlam</Th>
                      <Th color="deepSea.lavenderGrey">Türkçe</Th>
                      <Th w="50px"></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {words.map((w, i) => (
                      <Tr key={w.id} _hover={{ bg: 'whiteAlpha.50' }}>
                        <Td color="deepSea.lavenderGrey">{i + 1}</Td>
                        <Td fontWeight="bold">{w.eng}</Td>
                        <Td display={{ base: "none", sm: "table-cell" }} color="deepSea.lavenderGrey">{w.synonym || '-'}</Td>
                        <Td>{w.tr}</Td>
                        <Td>
                          <IconButton
                            aria-label="Sil"
                            icon={<DeleteIcon />}
                            colorScheme="red"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteId(w.id)}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Card>
          )}
        </Box>

        <Flex justify="center" w="100%" pb={8}>
          <Button
            variant="link"
            color="deepSea.lavenderGrey"
            onClick={() => navigate("/flashcards")}
          >
            Flash Kartlarda Çalış →
          </Button>
        </Flex>
      </Flex>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleRemoveWord}
        title="Kelimeyi Sil"
        description="Bu kelimeyi silmek istediğine emin misin?"
      />
    </Box>
  )
}