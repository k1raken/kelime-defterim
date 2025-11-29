import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    Box,
    Text,
    Heading,
    Flex,
    Divider,
    VStack,
    Button,
    useToast,
    HStack,
    Container,
    Icon,
    Badge,
    Switch,
    FormControl,
    FormLabel,
    Spacer
} from "@chakra-ui/react"
import { ChevronLeftIcon, DeleteIcon, DownloadIcon, InfoIcon } from "@chakra-ui/icons"
import { getSet, removeWord } from "../lib/storage"
import type { Word } from "../lib/storage"

export default function AcademicPrintScreen() {
    const { dayId, setId } = useParams()
    const navigate = useNavigate()
    const toast = useToast()

    const [words, setWords] = useState<Word[]>([])
    const [setName, setSetName] = useState("")

    // Toggle for Legacy Data
    const [showIncomplete, setShowIncomplete] = useState(false)

    useEffect(() => {
        if (!dayId || !setId) return
        const s = getSet(dayId, setId)
        if (s) {
            setWords(s.words)
            setSetName(s.name)
        }
    }, [dayId, setId])

    const handleDelete = (wordId: string) => {
        if (!dayId || !setId) return
        removeWord(dayId, setId, wordId)
        const s = getSet(dayId, setId)
        setWords(s?.words || [])
    }

    const handlePrint = () => {
        window.print()
    }

    // Filter words based on toggle
    const filteredWords = words.filter(w => {
        if (showIncomplete) return true
        // Only show words that have academic sentences (proxy for complete data)
        return w.academicSentences && w.academicSentences.length > 0
    })

    // Split words into chunks of 4 for each page
    const chunks = []
    for (let i = 0; i < filteredWords.length; i += 4) {
        chunks.push(filteredWords.slice(i, i + 4))
    }

    // Helper to render bold text from **text** format
    const renderBoldText = (text: string) => {
        if (!text) return text
        // Split by **...** capturing the delimiter
        const parts = text.split(/(\*\*.*?\*\*)/g)
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <Text as="span" fontWeight="bold" color="purple.600" key={index}>
                        {part.slice(2, -2)}
                    </Text>
                )
            }
            return <span key={index}>{part}</span>
        })
    }

    return (
        <Box minH="100vh" bg="#0f172a" fontFamily="'Inter', sans-serif"> {/* Deep Sea / Dark Mode Background */}
            {/* --- Control Panel (Hidden on Print) --- */}
            <Box
                className="no-print"
                bg="#0f172a"
                borderBottom="1px solid"
                borderColor="gray.700"
                py={4}
                px={6}
                position="sticky"
                top={0}
                zIndex={100}
                boxShadow="sm"
            >
                <Container maxW="container.xl">
                    <Flex
                        justify="space-between"
                        align="center"
                        wrap="wrap"
                        gap={4}
                        direction={{ base: 'column', md: 'row' }}
                    >
                        <HStack spacing={4} w={{ base: '100%', md: 'auto' }} justify={{ base: 'space-between', md: 'flex-start' }}>
                            <Button
                                leftIcon={<ChevronLeftIcon />}
                                onClick={() => navigate(-1)}
                                variant="ghost"
                                color="gray.300"
                                _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
                                size="sm"
                            >
                                Back
                            </Button>
                            <VStack align={{ base: 'end', md: 'start' }} spacing={0}>
                                <Heading size="sm" color="white">Academic Builder</Heading>
                                <Text fontSize="xs" color="gray.400">Print Preview</Text>
                            </VStack>
                        </HStack>

                        {/* Spacer only visible on desktop */}
                        <Spacer display={{ base: 'none', md: 'block' }} />

                        <Flex
                            gap={4}
                            align="center"
                            w={{ base: '100%', md: 'auto' }}
                            justify={{ base: 'space-between', md: 'flex-end' }}
                            wrap="wrap"
                        >
                            <FormControl display="flex" alignItems="center" w="auto">
                                <FormLabel htmlFor="incomplete-toggle" mb="0" fontSize="sm" color="gray.300" mr={2} cursor="pointer">
                                    Include Incomplete
                                </FormLabel>
                                <Switch
                                    id="incomplete-toggle"
                                    colorScheme="purple"
                                    isChecked={showIncomplete}
                                    onChange={(e) => setShowIncomplete(e.target.checked)}
                                />
                            </FormControl>

                            <HStack spacing={3}>
                                <Badge colorScheme="purple" p={2} borderRadius="md" fontSize="sm">
                                    {filteredWords.length} Words
                                </Badge>
                                <Button
                                    colorScheme="gray"
                                    variant="solid"
                                    onClick={handlePrint}
                                    leftIcon={<DownloadIcon />}
                                    bg="white"
                                    color="gray.900"
                                    _hover={{ bg: 'gray.100' }}
                                    size="sm"
                                >
                                    Print
                                </Button>
                            </HStack>
                        </Flex>
                    </Flex>
                </Container>
            </Box>

            {/* --- Print Preview Area --- */}
            <Box p={8} className="print-area" display="flex" flexDirection="column" alignItems="center" minH="calc(100vh - 90px)">
                <style>
                    {`
            @media print {
              .no-print { display: none !important; }
              
            @page {
              size: A4 portrait;
              margin: 0mm;
            }
            html, body, #root {
              margin: 0;
              padding: 0;
              width: 210mm;
              height: auto !important; /* FIXED: Allow multi-page growth */
              background: white !important;
            }

            .print-area { 
              width: 210mm;
              margin: 0;
              padding: 0;
              background: white !important;
            }

            .page-container {
              width: 210mm !important;
              height: 297mm !important; /* Full A4 Height */
              padding: 10mm !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              grid-template-rows: 1fr 1fr !important;
              gap: 10mm !important;
              page-break-after: always !important;
              overflow: hidden;
            }

            /* Explicitly disable break for the last page */
            .page-container.last-page {
              page-break-after: auto !important;
              break-after: auto !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
            
            /* Standard Card Layout for Print */
            .flashcard {
              height: 100% !important;
              border: 2px solid #1a202c !important;
              break-inside: avoid;
              padding: 1rem !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
            }
            
            .flashcard .academic-context-box { padding-left: 0.5rem !important; border-left-width: 3px !important; }
          }

            /* Screen Preview Styles - MATCHING PRINT STYLES */
            .page-container {
              width: 210mm;
              height: 260mm; /* Match print height */
              background: white;
              margin-bottom: 2rem;
              padding: 10mm; /* Match print padding */
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
              display: grid;
              /* Match print grid */
              grid-template-columns: repeat(2, minmax(0, 1fr));
              grid-template-rows: repeat(2, minmax(0, 1fr));
              gap: 5mm; /* Match print gap */
              position: relative;
              overflow: hidden; /* Match print overflow */
            }

            /* Apply standard styles to screen preview as well */
            .page-container .flashcard {
                padding: 1rem !important;
                overflow: hidden !important;
            }

            /* Mobile Responsiveness for Preview */
            @media screen and (max-width: 850px) {
                .page-container {
                    transform: scale(0.45);
                    transform-origin: top center;
                    margin-bottom: -140mm; /* Compensate for scale gap */
                }
            }
          `}
                </style>

                {filteredWords.length === 0 && (
                    <VStack py={20} spacing={4} color="gray.400">
                        <Icon as={InfoIcon} boxSize={10} color="gray.500" />
                        <Text fontSize="xl" fontWeight="medium">No words to display</Text>
                        <Text>Add words in the Set screen or enable "Include Incomplete" to see legacy data.</Text>
                    </VStack>
                )}

                {chunks.map((chunk, pageIndex) => (
                    <React.Fragment key={pageIndex}>
                        <Box className={`page-container ${pageIndex === chunks.length - 1 ? 'last-page' : ''}`}>
                            {/* Cut Lines Overlay */}
                            <Box position="absolute" inset="0" pointerEvents="none" zIndex={10} className="cut-lines">
                                {/* Vertical Line */}
                                <Box
                                    position="absolute"
                                    left="50%"
                                    top="0"
                                    bottom="0"
                                    borderLeft="2px dashed"
                                    borderColor="gray.300"
                                    transform="translateX(-50%)"
                                />
                                {/* Horizontal Line */}
                                <Box
                                    position="absolute"
                                    top="50%"
                                    left="0"
                                    right="0"
                                    borderTop="2px dashed"
                                    borderColor="gray.300"
                                    transform="translateY(-50%)"
                                />
                                {/* Scissors Center */}
                                <Box
                                    position="absolute"
                                    top="50%"
                                    left="50%"
                                    transform="translate(-50%, -50%)"
                                    bg="white"
                                    p={1}
                                    borderRadius="full"
                                    border="1px solid"
                                    borderColor="gray.200"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    width="30px"
                                    height="30px"
                                    fontSize="16px"
                                >
                                    ✂️
                                </Box>
                            </Box>

                            {/* Watermark/Guide for screen view */}
                            <Text
                                className="no-print"
                                position="absolute"
                                top="-30px"
                                left="0"
                                color="gray.400"
                                fontSize="sm"
                                fontWeight="bold"
                            >
                                Page {pageIndex + 1} (A4 Preview)
                            </Text>

                            {chunk.map((word) => (
                                <Flex
                                    key={word.id}
                                    direction="column"
                                    border="2px solid #1a202c"
                                    p={4}
                                    justify="space-between"
                                    h="100%"
                                    borderRadius="lg"
                                    bg="white"
                                    position="relative"
                                    className="flashcard"
                                    transition="all 0.2s"
                                    _hover={{ borderColor: "purple.500", boxShadow: "md" }}
                                    role="group"
                                >
                                    {/* Delete Button (Hover only, hidden on print) */}
                                    <Box
                                        position="absolute"
                                        top={3}
                                        right={3}
                                        className="no-print"
                                        opacity={0}
                                        _groupHover={{ opacity: 1 }}
                                        transition="opacity 0.2s"
                                        cursor="pointer"
                                        onClick={() => handleDelete(word.id)}
                                        bg="red.50"
                                        p={2}
                                        borderRadius="full"
                                        _hover={{ bg: "red.100" }}
                                    >
                                        <DeleteIcon color="red.500" boxSize={4} />
                                    </Box>

                                    {/* Header */}
                                    <Box>
                                        <Flex justify="space-between" align="baseline" mb={2} pr={8}>
                                            <Heading size="xl" fontFamily="'Merriweather', serif" letterSpacing="tight" color="gray.900" fontWeight="bold">
                                                {word.eng}
                                            </Heading>
                                            <Badge colorScheme="gray" fontSize="md" fontStyle="italic" px={2} borderRadius="full">
                                                {word.type || "?"}
                                            </Badge>
                                        </Flex>
                                        <Divider borderColor="gray.800" borderBottomWidth="2px" mb={4} opacity={1} />

                                        {/* Definition */}
                                        <Box mb={4}>
                                            <Text fontWeight="bold" fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={1} className="definition-label">
                                                Definition
                                            </Text>
                                            <Text fontSize="md" lineHeight="1.5" fontWeight="500" color="gray.800" fontFamily="sans-serif">
                                                {renderBoldText(word.engDefinition || "No definition available.")}
                                            </Text>
                                        </Box>

                                        {/* Synonyms */}
                                        {word.synonym && (
                                            <Box mb={4}>
                                                <Text fontWeight="bold" fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={1} className="definition-label">
                                                    Synonyms
                                                </Text>
                                                <Text fontStyle="italic" fontSize="sm" color="gray.700">
                                                    {word.synonym}
                                                </Text>
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Sentences - Flexible Height with Overflow Protection */}
                                    <Box flex="1" my={2} overflow="hidden" minH={0}>
                                        <Text fontWeight="bold" fontSize="xs" color="gray.500" textTransform="uppercase" mb={2} letterSpacing="wider" className="definition-label">
                                            Academic Context
                                        </Text>
                                        <VStack align="start" spacing={3}>
                                            {word.academicSentences && word.academicSentences.length > 0 ? (
                                                word.academicSentences.slice(0, 1).map((sentence, idx) => {
                                                    const isLongText = sentence.length > 150;
                                                    return (
                                                        <Box key={idx} pl={3} borderLeft="4px solid" borderColor="purple.400" className="academic-context-box">
                                                            <Text
                                                                fontSize={isLongText ? "xs" : "sm"}
                                                                color="gray.800"
                                                                lineHeight="1.4"
                                                                fontStyle="italic"
                                                                noOfLines={3}
                                                            >
                                                                "{renderBoldText(sentence)}"
                                                            </Text>
                                                        </Box>
                                                    );
                                                })
                                            ) : (
                                                <Text fontSize="sm" color="gray.400" fontStyle="italic">No academic sentences available.</Text>
                                            )}
                                        </VStack>
                                    </Box>

                                    {/* Footer (Turkish) - Fixed Bottom, Auto-Scaling */}
                                    <Box mt="auto" pt={4} borderTop="1px dashed #cbd5e0" flexShrink={0}>
                                        <Text
                                            textAlign="center"
                                            fontWeight="800"
                                            fontSize={word.tr.length > 20 ? "lg" : "xl"}
                                            color="gray.900"
                                            className="tr-footer"
                                        >
                                            {word.tr}
                                        </Text>
                                    </Box>
                                </Flex>
                            ))}
                        </Box>
                        {/* Explicit Page Break Spacer */}
                        {pageIndex < chunks.length - 1 && (
                            <Box className="force-page-break" />
                        )}
                    </React.Fragment>
                ))}
            </Box>
        </Box>
    )
}
