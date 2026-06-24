using BookSearchApp.Models;

namespace BookSearchApp.Services;

public class SmartSearchEngine
{
    private readonly Lock _modelLock = new();

    private volatile IReadOnlyDictionary<string, IReadOnlyDictionary<string, int>> _bigrams
        = new Dictionary<string, IReadOnlyDictionary<string, int>>();
    private volatile IReadOnlyList<string> _allWords = [];

    private static readonly Dictionary<string, string[]> _categories = new()
    {
        ["علوم"] = new[] { "أسرار جزيء الماء: المعجزة الحيوية", "دورة المياه في الطبيعة", "الماء والصحة: دليل الترطيب المثالي" },
        ["تاريخ"] = new[] { "تاريخ المياه: كيف شكلت الحضارة", "البحار والمحيطات: عجائب أسرار الأعماق" },
        ["بيئة"] = new[] { "الجليد والمناخ العالمي", "تلوث المياه وطرق معالجتها", "المحيطات والتغير المناخي", "الجفاف والتصحر: دليل المواجهة" },
        ["تقنية"] = new[] { "تحلية المياه: تقنيات المستقبل", "تكنولوجيا معالجة مياه الصرف", "نظام الري الذكي في الزراعة" },
        ["اقتصاد"] = new[] { "اقتصاديات المياه وسعر اللتر", "حروب المياه: الصراع القادم" }
    };

    private static readonly Dictionary<string, string> _englishToArabic = new(StringComparer.OrdinalIgnoreCase)
    {
        ["water"] = "ماء", ["waters"] = "مياه", ["sea"] = "بحر", ["seas"] = "بحار",
        ["ocean"] = "محيط", ["oceans"] = "محيطات", ["river"] = "نهر", ["rivers"] = "أنهار",
        ["rain"] = "مطر", ["ice"] = "جليد", ["snow"] = "ثلج", ["flood"] = "فيضان",
        ["drought"] = "جفاف", ["pollution"] = "تلوث", ["treatment"] = "معالجة",
        ["desalination"] = "تحلية", ["irrigation"] = "ري", ["agriculture"] = "زراعة",
        ["health"] = "صحة", ["climate"] = "مناخ", ["environment"] = "بيئة",
        ["history"] = "تاريخ", ["science"] = "علوم", ["technology"] = "تقنية",
        ["economy"] = "اقتصاد", ["war"] = "حرب", ["wars"] = "حروب",
        ["civilization"] = "حضارة", ["underground"] = "جوفية", ["future"] = "مستقبل",
        ["smart"] = "ذكي", ["global"] = "عالمي", ["natural"] = "طبيعة",
        ["molecule"] = "جزيء", ["secret"] = "أسرار", ["secrets"] = "أسرار",
        ["author"] = "مؤلف", ["book"] = "كتاب", ["books"] = "كتب",
        ["oldest"] = "أقدم", ["newest"] = "أحدث", ["all"] = "جميع",
        ["count"] = "كم", ["how many"] = "كم", ["recommend"] = "أقترح",
        ["category"] = "تصنيف", ["topic"] = "موضوع", ["about"] = "عن",
        ["show"] = "اعرض", ["find"] = "بحث", ["search"] = "بحث",
    };

    private static string TranslateToArabic(string query)
    {
        var result = query;
        foreach (var kv in _englishToArabic)
            result = System.Text.RegularExpressions.Regex.Replace(
                result, $@"\b{kv.Key}\b", kv.Value,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return result;
    }

    private static readonly Dictionary<string, string[]> _intentKeywords = new()
    {
        ["author"] = new[] { "مؤلف", "كاتب", "كتّاب", "من كتب", "ألف", "لمن" },
        ["year"] = new[] { "سنة", "عام", "متى", "صدر", "نشر", "تاريخ نشر" },
        ["oldest"] = new[] { "أقدم", "قديم", "أول" },
        ["newest"] = new[] { "أحدث", "جديد", "آخر", "أخير" },
        ["category"] = new[] { "علوم", "تاريخ", "بيئة", "تقنية", "اقتصاد", "ماء", "مياه" },
        ["count"] = new[] { "كم", "عدد", "عدد الكتب" },
        ["recommend"] = new[] { "أنصح", "أقترح", "اقترح", "أفضل", "أحسن", "ترشيح", "رشح", "انصح" },
        ["all"] = new[] { "كل", "جميع", "اعرض", "كلها" }
    };

    public void BuildModel(List<Book> books)
    {
        var localBigrams = new Dictionary<string, Dictionary<string, int>>();
        var wordSet      = new HashSet<string>();

        foreach (var book in books)
        {
            var titleWords  = Tokenize(book.Title);
            var authorWords = Tokenize(book.Author);

            AddNGrams(titleWords,  localBigrams);
            AddNGrams(authorWords, localBigrams);

            foreach (var w in titleWords)  wordSet.Add(w);
            foreach (var w in authorWords) wordSet.Add(w);
        }

        lock (_modelLock)
        {
            _bigrams  = localBigrams.ToDictionary(
                            kv => kv.Key,
                            kv => (IReadOnlyDictionary<string, int>)kv.Value);
            _allWords = wordSet.OrderBy(w => w).ToArray();
        }
    }

    private string[] Tokenize(string text)
    {
        return text.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
    }

    private static void AddNGrams(string[] words, Dictionary<string, Dictionary<string, int>> bigrams)
    {
        for (int i = 0; i < words.Length - 1; i++)
        {
            var current = words[i];
            var next    = words[i + 1];

            if (!bigrams.TryGetValue(current, out var followers))
                bigrams[current] = followers = [];

            followers[next] = followers.TryGetValue(next, out var count) ? count + 1 : 1;
        }
    }

    public List<string> PredictNextWords(string input, List<Book> books, int maxResults = 5)
    {
        if (string.IsNullOrWhiteSpace(input)) return new List<string>();

        var words = Tokenize(input.Trim());
        var lastWord = words.Last().ToLower();
        var predictions = new List<string>();

        if (_bigrams.ContainsKey(words.Last()))
        {
            predictions.AddRange(
                _bigrams[words.Last()]
                    .OrderByDescending(kv => kv.Value)
                    .Select(kv => kv.Key)
                    .Take(maxResults)
            );
        }

        var titleMatches = books
            .Where(b => b.Title.ToLower().Contains(lastWord) || b.Author.ToLower().Contains(lastWord))
            .Select(b => b.Title)
            .Take(maxResults)
            .ToList();

        var wordCompletions = _allWords
            .Where(w => w.ToLower().StartsWith(lastWord) && w.ToLower() != lastWord)
            .Take(maxResults)
            .ToList();

        var combined = new List<string>();
        combined.AddRange(titleMatches);
        combined.AddRange(predictions.Select(p => input.Trim() + " " + p));
        combined.AddRange(wordCompletions);

        return combined.Distinct().Take(maxResults).ToList();
    }

    public SmartSearchResult SmartSearch(string query, List<Book> books)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new SmartSearchResult
            {
                AiResponse = "مرحباً! اكتب أي شيء وسأساعدك في البحث عن الكتب. يمكنك البحث بالعنوان أو المؤلف أو الموضوع.",
                Books = books,
                Predictions = new List<string>(),
                Intent = "greeting"
            };
        }

        var translated = TranslateToArabic(query.Trim());
        var q = translated.ToLower();
        var intent = DetectIntent(q);
        var predictions = PredictNextWords(query, books);
        List<Book> results;
        string aiResponse;

        switch (intent)
        {
            case "oldest":
                results = books.OrderBy(b => b.Year).Take(5).ToList();
                var oldest = results.FirstOrDefault();
                aiResponse = oldest != null
                    ? $"أقدم كتاب في المكتبة هو «{oldest.Title}» للمؤلف {oldest.Author}، صدر سنة {oldest.Year}م. " +
                      $"وجدت لك {results.Count} من أقدم الكتب مرتبة حسب السنة."
                    : "لم أجد كتب في المكتبة.";
                break;

            case "newest":
                results = books.OrderByDescending(b => b.Year).Take(5).ToList();
                var newest = results.FirstOrDefault();
                aiResponse = newest != null
                    ? $"أحدث كتاب في المكتبة هو «{newest.Title}» للمؤلف {newest.Author}، صدر سنة {newest.Year}م. " +
                      $"إليك أحدث {results.Count} كتب."
                    : "لم أجد كتب في المكتبة.";
                break;

            case "count":
                results = books;
                aiResponse = $"يوجد في المكتبة حالياً {books.Count} كتاب. تتنوع بين الفلسفة والتاريخ والأدب والعلوم وتطوير الذات والسياسة.";
                break;

            case "category":
                var category = DetectCategory(q);
                var categoryBooks = GetBooksByCategory(category, books);
                results = categoryBooks;
                aiResponse = results.Count > 0
                    ? $"وجدت لك {results.Count} كتب في مجال {category}! " +
                      GenerateCategoryDescription(category, results)
                    : $"لم أجد كتب في مجال «{category}» حالياً. جرب البحث بموضوع آخر.";
                break;

            case "recommend":
                var random = new Random();
                results = books.OrderBy(_ => random.Next()).Take(3).ToList();
                aiResponse = $"أرشح لك هذه الكتب الرائعة:\n" +
                    string.Join("\n", results.Select((b, i) => $"{i + 1}. «{b.Title}» لـ {b.Author} ({b.Year}م)")) +
                    "\n\nكل كتاب منها يستحق القراءة!";
                break;

            case "all":
                results = books;
                aiResponse = $"إليك جميع الكتب المتوفرة في المكتبة ({books.Count} كتاب). تصفح واختر ما يناسبك!";
                break;

            case "author":
                results = SearchByAuthorIntent(q, books);
                aiResponse = results.Count > 0
                    ? $"وجدت {results.Count} كتب مرتبطة بالمؤلف. " +
                      GenerateAuthorDescription(results)
                    : GenerateNotFoundResponse(query);
                break;

            default:
                results = books.Where(b =>
                    b.Title.ToLower().Contains(q) ||
                    b.Author.ToLower().Contains(q)
                ).ToList();

                if (!results.Any())
                {
                    var meaningfulWords = q.Split(' ')
                        .Where(w => w.Length > 2)
                        .ToList();
                    if (meaningfulWords.Any())
                    {
                        results = books.Where(b =>
                            meaningfulWords.All(word =>
                                b.Title.ToLower().Contains(word) ||
                                b.Author.ToLower().Contains(word))
                        ).ToList();

                        if (!results.Any())
                        {
                            results = books.Where(b =>
                                meaningfulWords.Any(word =>
                                    b.Title.ToLower().Contains(word) ||
                                    b.Author.ToLower().Contains(word))
                            ).ToList();
                        }
                    }
                }

                aiResponse = results.Count > 0
                    ? GenerateSmartResponse(query, results)
                    : GenerateNotFoundResponse(query);
                break;
        }

        return new SmartSearchResult
        {
            AiResponse = aiResponse,
            Books = results,
            Predictions = predictions,
            Intent = intent
        };
    }

    private string DetectIntent(string query)
    {
        foreach (var intent in _intentKeywords)
        {
            if (intent.Value.Any(keyword => query.Contains(keyword)))
                return intent.Key;
        }
        return "general";
    }

    private string DetectCategory(string query)
    {
        foreach (var cat in _categories)
        {
            if (query.Contains(cat.Key.ToLower()) ||
                (cat.Key == "أدب" && query.Contains("رواية")) ||
                (cat.Key == "تطوير ذات" && query.Contains("تطوير")))
                return cat.Key;
        }
        return "عام";
    }

    private List<Book> GetBooksByCategory(string category, List<Book> books)
    {
        if (!_categories.ContainsKey(category)) return books;

        var categoryTitles = _categories[category];
        return books.Where(b => categoryTitles.Any(t => b.Title.Contains(t) || t.Contains(b.Title))).ToList();
    }

    private List<Book> SearchByAuthorIntent(string query, List<Book> books)
    {
        var authorQuery = query;
        foreach (var kw in _intentKeywords["author"])
            authorQuery = authorQuery.Replace(kw, "").Trim();

        if (string.IsNullOrWhiteSpace(authorQuery))
            return books;

        return books.Where(b =>
            b.Author.ToLower().Contains(authorQuery) ||
            authorQuery.Split(' ').Any(w => w.Length > 1 && b.Author.ToLower().Contains(w))
        ).ToList();
    }

    private string GenerateSmartResponse(string query, List<Book> results)
    {
        if (results.Count == 1)
        {
            var b = results[0];
            return $"وجدت لك «{b.Title}» للمؤلف {b.Author}، نُشر سنة {b.Year}م. " +
                   GetBookInsight(b);
        }

        var response = $"وجدت {results.Count} نتائج تطابق «{query}»:\n\n";
        foreach (var b in results.Take(3))
        {
            response += $"• «{b.Title}» — {b.Author} ({b.Year}م)\n";
        }

        if (results.Count > 3)
            response += $"\n...و {results.Count - 3} كتب أخرى.";

        return response;
    }

    private string GetBookInsight(Book book)
    {
        var insights = new Dictionary<string, string>
        {
            ["أسرار جزيء الماء: المعجزة الحيوية"] = "يشرح كيف يتفرد الماء بخصائص كيميائية فريدة جعلت منه أساس وجود الحياة على الأرض.",
            ["تحلية المياه: تقنيات المستقبل"] = "يتناول طرق التحلية الحديثة مثل التناضح العكسي كحل استراتيجي لأزمة المياه العذبة.",
            ["حروب المياه: الصراع القادم"] = "دراسة جيوسياسية للمناطق الساخنة حول العالم والمرشحة للنزاع على مصادر المياه العذبة.",
            ["تاريخ المياه: كيف شكلت الحضارة"] = "يستعرض كيف قامت أقدم وأعظم الحضارات الإنسانية حول ضفاف الأنهار والوديان المائية.",
            ["الماء والصحة: دليل الترطيب المثالي"] = "يقدم نصائح عملية لحساب الاحتياج اليومي للترطيب ودوره الحيوي في تنشيط خلايا الجسم.",
            ["المياه الجوفية: الكنوز المخفية"] = "يبحث في كيفية استكشاف المياه الجوفية وطرق استخراجها والحفاظ عليها كاحتياطي استراتيجي.",
            ["تلوث المياه وطرق معالجتها"] = "يسلط الضوء على مصادر التلوث المائي والتقنيات البيئية لمعالجة المياه وإعادة تدويرها."
        };

        return insights.TryGetValue(book.Title, out var insight)
            ? insight
            : $"كتاب قيم يبحث في شؤون المياه وعلاقتها بالبيئة والحضارة الإنسانية.";
    }

    private string GenerateNotFoundResponse(string query)
    {
        return $"لم أجد نتائج تطابق «{query}» في مكتبة المياه. جرّب:\n" +
               "• البحث بكلمة واحدة مثل: تحلية، بحر، نهر، ري\n" +
               "• البحث باسم مؤلف مائي\n" +
               "• اكتب موضوع مثل: علوم، تاريخ، بيئة، تقنية\n" +
               "• اكتب «أقدم» أو «أحدث» أو «أقترح»";
    }

    private string GenerateAuthorDescription(List<Book> results)
    {
        if (results.Count == 1)
        {
            var b = results[0];
            return $"الكتاب هو «{b.Title}» للمؤلف {b.Author} ({b.Year}م). " + GetBookInsight(b);
        }

        var authors = results.Select(b => b.Author).Distinct().ToList();
        return $"الكتب لـ {string.Join(" و ", authors.Take(3))}. " +
               $"أبرزها «{results[0].Title}» ({results[0].Year}م).";
    }

    private string GenerateCategoryDescription(string category, List<Book> results)
    {
        var bookNames = string.Join("، ", results.Take(3).Select(b => $"«{b.Title}»"));
        return $"أبرزها: {bookNames}. " +
               category switch
               {
                   "علوم" => "توضح هذه الكتب الخصائص العلمية الفريدة للماء وأثره الصحي والبيولوجي.",
                   "تاريخ" => "تأخذك هذه الكتب في رحلة لمعرفة دور البحار والأنهار في نشأة الحضارات.",
                   "بيئة" => "كتب تتناول قضايا المناخ وحماية كوكب الأرض والمصادر المائية.",
                   "تقنية" => "تستعرض أحدث التقنيات في الري والتحلية ومعالجة المياه.",
                   "اقتصاد" => "تتناول الجوانب الجيوسياسية والاقتصادية لتوزيع المياه.",
                   _ => "مجموعة متنوعة ومفيدة تستحق الاطلاع."
               };
    }
}

public class SmartSearchResult
{
    public string AiResponse { get; set; } = string.Empty;
    public List<Book> Books { get; set; } = new();
    public List<string> Predictions { get; set; } = new();
    public string Intent { get; set; } = "general";
}
