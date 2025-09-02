document.addEventListener('DOMContentLoaded', () => {
    // The API key is now embedded directly in the script for convenience.
    const API_KEY = "AIzaSyD_A-oMT2nw5gl66mZKMFVYob49x2Yzk3U";

    const textInput = document.getElementById('textInput');
    const fileInput = document.getElementById('fileInput');
    const generateBtn = document.getElementById('generateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const loading = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const outputContainer = document.getElementById('outputContainer');
    const summaryOutput = document.getElementById('summaryOutput');
    const flashcardsOutput = document.getElementById('flashcardsOutput');
    const quizOutput = document.getElementById('quizOutput');

    generateBtn.addEventListener('click', generateStudyGuide);
    clearBtn.addEventListener('click', clearAll);

    // Event listener for file upload
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Check file type
        if (file.type === 'application/pdf') {
            await readPdfFile(file);
        } else if (file.type.startsWith('image/')) {
            await readImageFile(file);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                textInput.value = e.target.result;
            };
            reader.readAsText(file);
        }
    });

    // Function to read and extract text from a PDF file
    async function readPdfFile(file) {
        showLoading();
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            try {
                // Set the workerSrc for pdf.js
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                textInput.value = fullText;
                hideLoading();
            } catch (error) {
                showError("Failed to load or read PDF file. Please try a different file.");
                console.error("PDF read error:", error);
            }
        };
    }

    // Function to read and process an image file
    async function readImageFile(file) {
        showLoading();
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const base64Data = e.target.result.split(',')[1];
            textInput.value = `[IMAGE_DATA]${base64Data}`; // Use a placeholder to indicate image
            hideLoading();
        };
    }

    // Hide output sections initially
    outputContainer.classList.add('hidden');

    async function generateStudyGuide() {
        const text = textInput.value;

        if (!text || text.length === 0) {
            showError("Please paste some text or upload a file to generate a study guide.");
            return;
        }

        showLoading();

        let payload;
        // Check if the input is an image placeholder
        if (text.startsWith('[IMAGE_DATA]')) {
            const base64Data = text.substring('[IMAGE_DATA]'.length);
            const imagePart = {
                inlineData: {
                    mimeType: fileInput.files[0].type,
                    data: base64Data,
                },
            };
            
            // Multimodal prompt for image and text
            const imagePrompt = `You are an expert educational assistant designed to create comprehensive study materials from the image provided. Your task is to analyze the image content and generate a structured study guide that includes a summary, flashcards, and a quiz.

            **INSTRUCTIONS:**
            1.  **Analyze the content:** Examine the visual content of the image.
            2.  **Act as a Tutor:** Adopt a clear, concise, and helpful tone.
            3.  **Produce the output in a structured format:** Use markdown headings and lists to clearly separate each section. Do not include any introductory or concluding sentences outside of the requested content.

            **REQUIRED OUTPUT:**

            **SECTION 1: CONCISE SUMMARY**
            -   Provide a bullet-point summary of the core concepts, key figures, and essential terms found in the image.
            -   The summary should be easy to scan and retain, acting as a quick review of the material.

            **SECTION 2: FLASHCARDS**
            -   Generate 5 flashcard pairs based on key terms and concepts from the image.
            -   Each flashcard should follow a "Term: Definition" or "Question: Answer" format.
            -   Format each flashcard pair on a separate line, with the term/question in bold, followed by a colon and the definition/answer.

            **SECTION 3: PRACTICE QUIZ**
            -   Create a 3-question quiz to test a learner's comprehension of the image's material.
            -   For each question, provide the correct answer and a brief explanation of why it is correct.
            -   Format the quiz clearly with numbered questions.

            Please provide the entire output in a single response, strictly adhering to the specified headings and formatting.`;

            payload = {
                contents: [{
                    parts: [{ text: imagePrompt }, imagePart]
                }],
            };
        } else {
            // Standard text prompt
            const textPrompt = `You are an expert educational assistant designed to create comprehensive study materials from a given text. Your task is to analyze the provided material and generate a structured study guide that includes a summary, flashcards, and a quiz.

            **INSTRUCTIONS:**
            1.  **Analyze the text:** Read and understand the entire document provided below.
            2.  **Act as a Tutor:** Adopt a clear, concise, and helpful tone.
            3.  **Produce the output in a structured format:** Use markdown headings and lists to clearly separate each section. Do not include any introductory or concluding sentences outside of the requested content.

            **TEXT INPUT:**
            ${text}

            **REQUIRED OUTPUT:**

            **SECTION 1: CONCISE SUMMARY**
            -   Provide a bullet-point summary of the core concepts, key figures, and essential terms from the text.
            -   The summary should be easy to scan and retain, acting as a quick review of the material.

            **SECTION 2: FLASHCARDS**
            -   Generate 10 flashcard pairs (20 total cards) based on key terms and concepts from the text.
            -   Each flashcard should follow a "Term: Definition" or "Question: Answer" format.
            -   Format each flashcard pair on a separate line, with the term/question in bold, followed by a colon and the definition/answer.

            **SECTION 3: PRACTICE QUIZ**
            -   Create a 5-question quiz to test a learner's comprehension of the material.
            -   The quiz should include a mix of question types, such as multiple-choice and true/false.
            -   For each question, provide the correct answer and a brief explanation of why it is correct.
            -   Format the quiz clearly with numbered questions.

            Please provide the entire output in a single response, strictly adhering to the specified headings and formatting.
            `;
            payload = {
                contents: [{
                    parts: [{
                        text: textPrompt
                    }]
                }],
            };
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error.message}`);
            }

            const result = await response.json();
            const generatedText = result.candidates[0].content.parts[0].text;
            displayResults(generatedText);

        } catch (err) {
            showError(`Failed to generate study guide. ${err.message}`);
            console.error('API Error:', err);
        } finally {
            hideLoading();
        }
    }

    function showLoading() {
        errorElement.classList.add('hidden');
        loading.classList.remove('hidden');
        outputContainer.classList.add('hidden'); // Hide results while loading
    }

    function hideLoading() {
        loading.classList.add('hidden');
    }

    function showError(message) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        hideLoading();
    }

    function displayResults(fullText) {
        // Regular expressions to split the content by section headings
        const summaryRegex = /\*\*SECTION 1: CONCISE SUMMARY\*\*\n([\s\S]*?)\*\*SECTION 2: FLASHCARDS\*\*/;
        const flashcardsRegex = /\*\*SECTION 2: FLASHCARDS\*\*\n([\s\S]*?)\*\*SECTION 3: PRACTICE QUIZ\*\*/;
        const quizRegex = /\*\*SECTION 3: PRACTICE QUIZ\*\*\n([\s\S]*)/;

        const summaryMatch = fullText.match(summaryRegex);
        const flashcardsMatch = fullText.match(flashcardsRegex);
        const quizMatch = fullText.match(quizRegex);

        // Clear previous output
        summaryOutput.innerHTML = '';
        flashcardsOutput.innerHTML = '';
            quizOutput.innerHTML = '';

        // Handle Summary
        if (summaryMatch && summaryMatch[1]) {
            const summary = summaryMatch[1].trim();
            summaryOutput.innerHTML = formatMarkdownToList(summary);
        }

        // Handle Flashcards
        if (flashcardsMatch && flashcardsMatch[1]) {
            const flashcards = flashcardsMatch[1].trim().split('\n').filter(line => line.trim() !== '');
            flashcards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = "bg-gray-100 p-4 rounded-lg transition-transform duration-300 hover:scale-105 transform cursor-pointer";
                const parts = card.split(':');
                const front = parts[0].trim().replace(/\*\*/g, ''); // Remove bold markdown
                const back = parts.slice(1).join(':').trim();

                cardElement.innerHTML = `<p class="font-semibold text-lg">${front}</p>`;
                
                cardElement.addEventListener('click', () => {
                    cardElement.innerHTML = `<p class="font-semibold text-lg">${front}</p><p class="mt-2">${back}</p>`;
                });

                flashcardsOutput.appendChild(cardElement);
            });
        }

        // Handle Quiz
        if (quizMatch && quizMatch[1]) {
            const quiz = quizMatch[1].trim();
            const questions = quiz.split(/\n\d+\. /).filter(q => q.trim() !== '');
            questions.forEach((q, index) => {
                const questionElement = document.createElement('div');
                questionElement.className = "bg-gray-100 p-4 rounded-lg";
                const lines = q.trim().split('\n').filter(line => line.trim() !== '');
                const questionText = lines[0].trim();
                const answerLines = lines.slice(1);
                const answerHtml = answerLines.map(line => `<p class="mt-1">${line}</p>`).join('');

                questionElement.innerHTML = `<h3 class="font-semibold text-lg mb-2">${index + 1}. ${questionText}</h3><div class="text-gray-700">${answerHtml}</div>`;
                quizOutput.appendChild(questionElement);
            });
        }

        outputContainer.classList.remove('hidden');
    }

    function formatMarkdownToList(text) {
        // Simple markdown to list formatting for the summary
        const lines = text.split('\n');
        let html = '<ul class="list-disc list-inside space-y-2">';
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('*')) {
                html += `<li>${trimmedLine.substring(1).trim()}</li>`;
            } else if (trimmedLine.startsWith('-')) {
                html += `<li>${trimmedLine.substring(1).trim()}</li>`;
            }
        });
        html += '</ul>';
        return html;
    }

    function clearAll() {
        textInput.value = '';
        outputContainer.classList.add('hidden');
        summaryOutput.innerHTML = '';
        flashcardsOutput.innerHTML = '';
        quizOutput.innerHTML = '';
        errorElement.classList.add('hidden');
    }
});
