const LESSONS = [
  {
    id: "print",
    title: "print()",
    group: "basics",
    groupLabel: "basics",
    lesson: `
      <span class="lesson-tag">chapter 1 - basics</span>
      <h2>print()</h2>
      <p><code>print()</code> is how you show text on screen. it's the first thing you learn in python.</p>
      <div class="code-block"><span class="fn">print</span>(<span class="str">"hello world"</span>)
<span class="fn">print</span>(<span class="str">"my name is python"</span>)
<span class="fn">print</span>(<span class="num">42</span>)</div>
      <p>you can put anything inside the parentheses - strings, numbers, or even calculations.</p>
      <div class="tip-box"><strong>tip:</strong> text goes in quotes, numbers don't.</div>
    `,
    quiz: [
      {
        q: "what does print(\"hi\") do?",
        options: ["creates a file named hi", "shows hi on screen", "deletes hi", "does nothing"],
        answer: 1
      },
      {
        q: "which is correct?",
        options: ["print 42", "print(42)", "print[42]", "print{42}"],
        answer: 1
      }
    ],
    challenge: {
      desc: "print your name, then print your age on the next line.",
      solution: 'print("sloth")\nprint(100)',
      hint: "use two print statements"
    }
  },
  {
    id: "variables",
    title: "variables",
    group: "basics",
    groupLabel: "basics",
    lesson: `
      <span class="lesson-tag">chapter 1 - basics</span>
      <h2>variables</h2>
      <p>variables store data. think of them as labeled boxes that hold values.</p>
      <div class="code-block">name = <span class="str">"sloth"</span>
age = <span class="num">25</span>
height = <span class="num">5.9</span>

<span class="fn">print</span>(name)
<span class="fn">print</span>(age)</div>
      <p>use <code>=</code> to assign a value. the name goes on the left, value on the right.</p>
      <h3>naming rules</h3>
      <p>variable names can use letters, numbers, and underscores. they can't start with a number.</p>
      <div class="code-block"><span class="cmt"># good</span>
my_name = <span class="str">"sloth"</span>
age2 = <span class="num">10</span>
_private = <span class="num">0</span>

<span class="cmt"># bad</span>
2name = <span class="str">"nope"</span>
my-name = <span class="str">"nope"</span></div>
    `,
    quiz: [
      {
        q: "what's the value of x after: x = 5, x = x + 2",
        options: ["5", "7", "12", "error"],
        answer: 1
      },
      {
        q: "which is a valid variable name?",
        options: ["2fast", "my-var", "my_var", "class"],
        answer: 2
      }
    ],
    challenge: {
      desc: "create variables for your name, age, and favorite language, then print them all.",
      solution: 'name = "sloth"\nage = 25\nfav = "python"\nprint(name)\nprint(age)\nprint(fav)',
      hint: "create 3 variables with = and print each one"
    }
  },
  {
    id: "datatypes",
    title: "data types",
    group: "basics",
    groupLabel: "basics",
    lesson: `
      <span class="lesson-tag">chapter 1 - basics</span>
      <h2>data types</h2>
      <p>every value in python has a type. the main ones are:</p>
      <div class="code-block"><span class="cmt"># strings - text</span>
name = <span class="str">"hello"</span>

<span class="cmt"># integers - whole numbers</span>
age = <span class="num">25</span>

<span class="cmt"># floats - decimal numbers</span>
height = <span class="num">5.9</span>

<span class="cmt"># booleans - true or false</span>
is_cool = <span class="kw">True</span></div>
      <p>use <code>type()</code> to check what type something is:</p>
      <div class="code-block"><span class="fn">print</span>(<span class="fn">type</span>(<span class="str">"hello"</span>))   <span class="cmt"># &lt;class 'str'&gt;</span>
<span class="fn">print</span>(<span class="fn">type</span>(<span class="num">42</span>))       <span class="cmt"># &lt;class 'int'&gt;</span>
<span class="fn">print</span>(<span class="fn">type</span>(<span class="num">3.14</span>))     <span class="cmt"># &lt;class 'float'&gt;</span>
<span class="fn">print</span>(<span class="fn">type</span>(<span class="kw">True</span>))     <span class="cmt"># &lt;class 'bool'&gt;</span></div>
    `,
    quiz: [
      {
        q: "what type is 3.14?",
        options: ["int", "float", "string", "bool"],
        answer: 1
      },
      {
        q: "what type is \"python\"?",
        options: ["str", "text", "string", "word"],
        answer: 0
      }
    ],
    challenge: {
      desc: "create one variable of each type (string, int, float, bool) and print their types using type().",
      solution: 's = "hi"\nn = 10\nf = 3.14\nb = True\nprint(type(s))\nprint(type(n))\nprint(type(f))\nprint(type(b))',
      hint: "use type() to check each variable"
    }
  },
  {
    id: "math",
    title: "math operators",
    group: "basics",
    groupLabel: "basics",
    lesson: `
      <span class="lesson-tag">chapter 1 - basics</span>
      <h2>math operators</h2>
      <p>python can do math. here are the operators:</p>
      <div class="code-block"><span class="num">5</span> + <span class="num">3</span>    <span class="cmt"># addition = 8</span>
<span class="num">5</span> - <span class="num">3</span>    <span class="cmt"># subtraction = 2</span>
<span class="num">5</span> * <span class="num">3</span>    <span class="cmt"># multiplication = 15</span>
<span class="num">5</span> / <span class="num">3</span>    <span class="cmt"># division = 1.6667</span>
<span class="num">5</span> // <span class="num">3</span>   <span class="cmt"># floor division = 1</span>
<span class="num">5</span> % <span class="num">3</span>    <span class="cmt"># modulo (remainder) = 2</span>
<span class="num">5</span> ** <span class="num">3</span>   <span class="cmt"># power = 125</span></div>
      <p>you can combine these with variables:</p>
      <div class="code-block">x = <span class="num">10</span>
y = <span class="num">3</span>
<span class="fn">print</span>(x + y)   <span class="cmt"># 13</span>
<span class="fn">print</span>(x ** y)  <span class="cmt"># 1000</span></div>
    `,
    quiz: [
      {
        q: "what is 10 % 3?",
        options: ["3", "1", "3.33", "0"],
        answer: 1
      },
      {
        q: "what does ** do?",
        options: ["multiply", "divide", "power", "subtract"],
        answer: 2
      }
    ],
    challenge: {
      desc: "calculate the area of a rectangle (width=7, height=4) and the volume of a cube (side=3). print both.",
      solution: 'area = 7 * 4\nvolume = 3 ** 3\nprint(area)\nprint(volume)',
      hint: "area = width * height, volume = side ** 3"
    }
  },
  {
    id: "strings",
    title: "strings",
    group: "basics",
    groupLabel: "basics",
    lesson: `
      <span class="lesson-tag">chapter 1 - basics</span>
      <h2>strings</h2>
      <p>strings are text. you can combine them, slice them, and do lots of stuff.</p>
      <div class="code-block"><span class="cmt"># concatenation</span>
first = <span class="str">"hello"</span>
second = <span class="str">" world"</span>
<span class="fn">print</span>(first + second)  <span class="cmt"># hello world</span>

<span class="cmt"># repetition</span>
<span class="fn">print</span>(<span class="str">"ha"</span> * <span class="num">3</span>)  <span class="cmt"># hahaha</span>

<span class="cmt"># length</span>
<span class="fn">print</span>(<span class="fn">len</span>(<span class="str">"python"</span>))  <span class="cmt"># 6</span>

<span class="cmt"># indexing</span>
word = <span class="str">"hello"</span>
<span class="fn">print</span>(word[<span class="num">0</span>])  <span class="cmt"># h</span>
<span class="fn">print</span>(word[<span class="num">-1</span>]) <span class="cmt"># o</span>

<span class="cmt"># slicing</span>
<span class="fn">print</span>(word[<span class="num">1</span>:<span class="num">4</span>])  <span class="cmt"># ell</span></div>
      <h3>f-strings</h3>
      <p>f-strings let you put variables inside strings:</p>
      <div class="code-block">name = <span class="str">"sloth"</span>
age = <span class="num">25</span>
<span class="fn">print</span>(<span class="str">f"i am </span>{name}<span class="str"> and im </span>{age}<span class="str"> years old"</span>)</div>
    `,
    quiz: [
      {
        q: "what is \"abc\"[1]?",
        options: ["a", "b", "c", "ab"],
        answer: 1
      },
      {
        q: "how do you make an f-string?",
        options: ["f\"text\"", "fmt\"text\"", "string\"text\"", "f'text'"],
        answer: 0
      }
    ],
    challenge: {
      desc: "create variables for your first and last name, then use an f-string to print your full name.",
      solution: 'first = "sloth"\nlast = "dev"\nprint(f"{first} {last}")',
      hint: "use f\"{first} {last}\""
    }
  },
  {
    id: "ifelse",
    title: "if / elif / else",
    group: "control",
    groupLabel: "control flow",
    lesson: `
      <span class="lesson-tag">chapter 2 - control flow</span>
      <h2>if / elif / else</h2>
      <p>conditionals let your program make decisions.</p>
      <div class="code-block">age = <span class="num">18</span>

<span class="kw">if</span> age &gt;= <span class="num">18</span>:
    <span class="fn">print</span>(<span class="str">"you're an adult"</span>)
<span class="kw">elif</span> age &gt;= <span class="num">13</span>:
    <span class="fn">print</span>(<span class="str">"you're a teen"</span>)
<span class="kw">else</span>:
    <span class="fn">print</span>(<span class="str">"you're a kid"</span>)</div>
      <p>indentation matters! the code inside each block must be indented.</p>
      <h3>comparison operators</h3>
      <div class="code-block">==    <span class="cmt"># equal to</span>
!=    <span class="cmt"># not equal to</span>
&gt;     <span class="cmt"># greater than</span>
&lt;     <span class="cmt"># less than</span>
&gt;=    <span class="cmt"># greater or equal</span>
&lt;=    <span class="cmt"># less or equal</span></div>
      <h3>logical operators</h3>
      <div class="code-block"><span class="kw">and</span>  <span class="cmt"># both must be true</span>
<span class="kw">or</span>   <span class="cmt"># at least one must be true</span>
<span class="kw">not</span>  <span class="cmt"># flips true/false</span></div>
    `,
    quiz: [
      {
        q: "what prints when x=5: if x > 10: print('big') elif x > 3: print('mid') else: print('small')",
        options: ["big", "mid", "small", "nothing"],
        answer: 1
      },
      {
        q: "what does != mean?",
        options: ["equal", "not equal", "greater", "less"],
        answer: 1
      }
    ],
    challenge: {
      desc: "write code that checks if a number is positive, negative, or zero. store the number in a variable.",
      solution: 'num = -5\nif num > 0:\n    print("positive")\nelif num < 0:\n    print("negative")\nelse:\n    print("zero")',
      hint: "use if, elif, and else with > and <"
    }
  },
  {
    id: "while",
    title: "while loops",
    group: "control",
    groupLabel: "control flow",
    lesson: `
      <span class="lesson-tag">chapter 2 - control flow</span>
      <h2>while loops</h2>
      <p>while loops repeat code as long as a condition is true.</p>
      <div class="code-block">count = <span class="num">0</span>
<span class="kw">while</span> count &lt; <span class="num">5</span>:
    <span class="fn">print</span>(count)
    count += <span class="num">1</span></div>
      <p>this prints 0, 1, 2, 3, 4.</p>
      <h3>break and continue</h3>
      <div class="code-block"><span class="cmt"># break - exit the loop</span>
<span class="kw">while</span> <span class="kw">True</span>:
    x = <span class="fn">input</span>(<span class="str">"type quit: "</span>)
    <span class="kw">if</span> x == <span class="str">"quit"</span>:
        <span class="kw">break</span>

<span class="cmt"># continue - skip to next iteration</span>
n = <span class="num">0</span>
<span class="kw">while</span> n &lt; <span class="num">10</span>:
    n += <span class="num">1</span>
    <span class="kw">if</span> n % <span class="num">2</span> == <span class="num">0</span>:
        <span class="kw">continue</span>
    <span class="fn">print</span>(n)  <span class="cmt"># only prints odd numbers</span></div>
      <div class="tip-box"><strong>warning:</strong> a while loop that never becomes false is an infinite loop. always make sure the condition will eventually change.</div>
    `,
    quiz: [
      {
        q: "how many times does this run: while True: print('hi'); break",
        options: ["forever", "0 times", "1 time", "error"],
        answer: 2
      },
      {
        q: "what does continue do?",
        options: ["stops the loop", "skips to next iteration", "restarts the loop", "exits the program"],
        answer: 1
      }
    ],
    challenge: {
      desc: "use a while loop to count from 1 to 10 and print each number.",
      solution: 'n = 1\nwhile n <= 10:\n    print(n)\n    n += 1',
      hint: "start at 1, loop while n <= 10, increment n each time"
    }
  },
  {
    id: "for",
    title: "for loops",
    group: "control",
    groupLabel: "control flow",
    lesson: `
      <span class="lesson-tag">chapter 2 - control flow</span>
      <h2>for loops</h2>
      <p>for loops iterate over a sequence (like a list or range).</p>
      <div class="code-block"><span class="cmt"># range</span>
<span class="kw">for</span> i <span class="kw">in</span> <span class="fn">range</span>(<span class="num">5</span>):
    <span class="fn">print</span>(i)  <span class="cmt"># 0, 1, 2, 3, 4</span>

<span class="cmt"># range with start</span>
<span class="kw">for</span> i <span class="kw">in</span> <span class="fn">range</span>(<span class="num">2</span>, <span class="num">7</span>):
    <span class="fn">print</span>(i)  <span class="cmt"># 2, 3, 4, 5, 6</span>

<span class="cmt"># range with step</span>
<span class="kw">for</span> i <span class="kw">in</span> <span class="fn">range</span>(<span class="num">0</span>, <span class="num">10</span>, <span class="num">2</span>):
    <span class="fn">print</span>(i)  <span class="cmt"># 0, 2, 4, 6, 8</span></div>
      <h3>looping over lists</h3>
      <div class="code-block">fruits = [<span class="str">"apple"</span>, <span class="str">"banana"</span>, <span class="str">"cherry"</span>]
<span class="kw">for</span> fruit <span class="kw">in</span> fruits:
    <span class="fn">print</span>(fruit)</div>
      <h3>enumerate</h3>
      <div class="code-block"><span class="kw">for</span> i, fruit <span class="kw">in</span> <span class="fn">enumerate</span>(fruits):
    <span class="fn">print</span>(<span class="str">f"</span>{i}<span class="str">: </span>{fruit}<span class="str">"</span>)</div>
    `,
    quiz: [
      {
        q: "what does range(3) produce?",
        options: ["[1,2,3]", "[0,1,2,3]", "[0,1,2]", "[3]"],
        answer: 2
      },
      {
        q: "what is enumerate used for?",
        options: ["counting items", "getting index and value", "sorting", "reversing"],
        answer: 1
      }
    ],
    challenge: {
      desc: "use a for loop to print numbers 1 through 20, but skip multiples of 3.",
      solution: 'for i in range(1, 21):\n    if i % 3 == 0:\n        continue\n    print(i)',
      hint: "use range(1, 21) and continue when i % 3 == 0"
    }
  },
  {
    id: "lists",
    title: "lists",
    group: "collections",
    groupLabel: "collections",
    lesson: `
      <span class="lesson-tag">chapter 3 - collections</span>
      <h2>lists</h2>
      <p>lists hold multiple values in order.</p>
      <div class="code-block">nums = [<span class="num">1</span>, <span class="num">2</span>, <span class="num">3</span>, <span class="num">4</span>, <span class="num">5</span>]
names = [<span class="str">"sloth"</span>, <span class="str">"dev"</span>]
mixed = [<span class="num">1</span>, <span class="str">"hello"</span>, <span class="kw">True</span>]</div>
      <h3>accessing</h3>
      <div class="code-block">nums = [<span class="num">10</span>, <span class="num">20</span>, <span class="num">30</span>]
<span class="fn">print</span>(nums[<span class="num">0</span>])   <span class="cmt"># 10</span>
<span class="fn">print</span>(nums[<span class="num">-1</span>])  <span class="cmt"># 30</span></div>
      <h3>modifying</h3>
      <div class="code-block">nums = [<span class="num">1</span>, <span class="num">2</span>, <span class="num">3</span>]
nums.append(<span class="num">4</span>)      <span class="cmt"># [1, 2, 3, 4]</span>
nums.insert(<span class="num">0</span>, <span class="num">0</span>)   <span class="cmt"># [0, 1, 2, 3, 4]</span>
nums.remove(<span class="num">2</span>)      <span class="cmt"># [0, 1, 3, 4]</span>
nums.pop()           <span class="cmt"># [0, 1, 3]</span>
<span class="fn">len</span>(nums)            <span class="cmt"># 3</span></div>
      <h3>slicing</h3>
      <div class="code-block">nums = [<span class="num">0</span>, <span class="num">1</span>, <span class="num">2</span>, <span class="num">3</span>, <span class="num">4</span>]
<span class="fn">print</span>(nums[<span class="num">1</span>:<span class="num">4</span>])   <span class="cmt"># [1, 2, 3]</span>
<span class="fn">print</span>(nums[::<span class="num">2</span>])    <span class="cmt"># [0, 2, 4]</span>
<span class="fn">print</span>(nums[::<span class="num">-1</span>])   <span class="cmt"># [4, 3, 2, 1, 0]</span></div>
    `,
    quiz: [
      {
        q: "what does [1,2,3].append(4) do?",
        options: ["returns [1,2,3]", "returns [1,2,3,4]", "returns [4,1,2,3]", "error"],
        answer: 1
      },
      {
        q: "what does [10,20,30][1] give?",
        options: ["10", "20", "30", "error"],
        answer: 1
      }
    ],
    challenge: {
      desc: "create a list of 5 numbers. append a 6th, remove the 2nd, then print the reversed list.",
      solution: 'nums = [1, 2, 3, 4, 5]\nnums.append(6)\nnums.remove(2)\nprint(nums[::-1])',
      hint: "use append(), remove(), and [::-1] for reverse"
    }
  },
  {
    id: "dicts",
    title: "dictionaries",
    group: "collections",
    groupLabel: "collections",
    lesson: `
      <span class="lesson-tag">chapter 3 - collections</span>
      <h2>dictionaries</h2>
      <p>dictionaries store key-value pairs.</p>
      <div class="code-block">person = {
    <span class="str">"name"</span>: <span class="str">"sloth"</span>,
    <span class="str">"age"</span>: <span class="num">25</span>,
    <span class="str">"lang"</span>: <span class="str">"python"</span>
}

<span class="fn">print</span>(person[<span class="str">"name"</span>])   <span class="cmt"># sloth</span>
person[<span class="str">"age"</span>] = <span class="num">26</span>      <span class="cmt"># update</span>
person[<span class="str">"height"</span>] = <span class="num">5.9</span> <span class="cmt"># add new</span></div>
      <h3>useful methods</h3>
      <div class="code-block">person.keys()     <span class="cmt"># dict_keys(['name', 'age'])</span>
person.values()   <span class="cmt"># dict_values(['sloth', 26])</span>
person.items()    <span class="cmt"># key-value pairs</span>
person.get(<span class="str">"name"</span>) <span class="cmt"># sloth (safe access)</span>
person.pop(<span class="str">"age"</span>)  <span class="cmt"># removes and returns</span></div>
      <h3>looping</h3>
      <div class="code-block"><span class="kw">for</span> key, value <span class="kw">in</span> person.items():
    <span class="fn">print</span>(<span class="str">f"</span>{key}<span class="str">: </span>{value}<span class="str">"</span>)</div>
    `,
    quiz: [
      {
        q: "how do you access a value in a dict?",
        options: ["dict[0]", "dict.key", "dict['key']", "dict.get(0)"],
        answer: 2
      },
      {
        q: "what does .items() return?",
        options: ["just values", "just keys", "key-value pairs", "a list"],
        answer: 2
      }
    ],
    challenge: {
      desc: "create a dictionary with 3 of your favorite things (key=category, value=item). loop through and print each.",
      solution: 'favs = {\n    "food": "pizza",\n    "game": "minecraft",\n    "color": "green"\n}\nfor k, v in favs.items():\n    print(f"{k}: {v}")',
      hint: "create a dict with {key: value} pairs"
    }
  },
  {
    id: "listcomp",
    title: "list comprehensions",
    group: "collections",
    groupLabel: "collections",
    lesson: `
      <span class="lesson-tag">chapter 3 - collections</span>
      <h2>list comprehensions</h2>
      <p>a shorter way to create lists from other sequences.</p>
      <div class="code-block"><span class="cmt"># normal way</span>
squares = []
<span class="kw">for</span> x <span class="kw">in</span> <span class="fn">range</span>(<span class="num">5</span>):
    squares.append(x ** <span class="num">2</span>)

<span class="cmt"># list comprehension</span>
squares = [x ** <span class="num">2</span> <span class="kw">for</span> x <span class="kw">in</span> <span class="fn">range</span>(<span class="num">5</span>)]
<span class="cmt"># [0, 1, 4, 9, 16]</span></div>
      <h3>with condition</h3>
      <div class="code-block">evens = [x <span class="kw">for</span> x <span class="kw">in</span> <span class="fn">range</span>(<span class="num">10</span>) <span class="kw">if</span> x % <span class="num">2</span> == <span class="num">0</span>]
<span class="cmt"># [0, 2, 4, 6, 8]</span></div>
      <h3>nested</h3>
      <div class="code-block">pairs = [(x, y) <span class="kw">for</span> x <span class="kw">in</span> <span class="fn">range</span>(<span class="num">3</span>) <span class="kw">for</span> y <span class="kw">in</span> <span class="fn">range</span>(<span class="num">3</span>)]
<span class="cmt"># [(0,0),(0,1),(0,2),(1,0),(1,1),(1,2),(2,0),(2,1),(2,2)]</span></div>
    `,
    quiz: [
      {
        q: "what does [x*2 for x in range(4)] produce?",
        options: ["[2,4,6,8]", "[0,2,4,6]", "[1,2,3,4]", "[0,1,2,3]"],
        answer: 1
      },
      {
        q: "how do you add a filter to a list comprehension?",
        options: ["where", "filter", "if", "select"],
        answer: 2
      }
    ],
    challenge: {
      desc: "use a list comprehension to create a list of all numbers from 1-20 that are divisible by 3.",
      solution: 'threes = [x for x in range(1, 21) if x % 3 == 0]\nprint(threes)',
      hint: "use [x for x in range(1, 21) if x % 3 == 0]"
    }
  },
  {
    id: "functions",
    title: "functions",
    group: "functions",
    groupLabel: "functions",
    lesson: `
      <span class="lesson-tag">chapter 4 - functions</span>
      <h2>functions</h2>
      <p>functions are reusable blocks of code.</p>
      <div class="code-block"><span class="kw">def</span> <span class="fn">greet</span>(name):
    <span class="fn">print</span>(<span class="str">f"hello, </span>{name}<span class="str">!"</span>)

<span class="fn">greet</span>(<span class="str">"sloth"</span>)  <span class="cmt"># hello, sloth!</span>
<span class="fn">greet</span>(<span class="str">"dev"</span>)    <span class="cmt"># hello, dev!</span></div>
      <h3>return values</h3>
      <div class="code-block"><span class="kw">def</span> <span class="fn">add</span>(a, b):
    <span class="kw">return</span> a + b

result = <span class="fn">add</span>(<span class="num">3</span>, <span class="num">5</span>)
<span class="fn">print</span>(result)  <span class="cmt"># 8</span></div>
      <h3>default parameters</h3>
      <div class="code-block"><span class="kw">def</span> <span class="fn">greet</span>(name, greeting=<span class="str">"hello"</span>):
    <span class="fn">print</span>(<span class="str">f"</span>{greeting}<span class="str">, </span>{name}<span class="str">!"</span>)

<span class="fn">greet</span>(<span class="str">"sloth"</span>)           <span class="cmt"># hello, sloth!</span>
<span class="fn">greet</span>(<span class="str">"sloth"</span>, <span class="str">"yo"</span>)     <span class="cmt"># yo, sloth!</span></div>
      <h3>multiple returns</h3>
      <div class="code-block"><span class="kw">def</span> <span class="fn">get_info</span>():
    <span class="kw">return</span> <span class="str">"sloth"</span>, <span class="num">25</span>

name, age = <span class="fn">get_info</span>()</div>
    `,
    quiz: [
      {
        q: "what keyword defines a function?",
        options: ["function", "func", "def", "define"],
        answer: 2
      },
      {
        q: "what does return do?",
        options: ["prints a value", "sends a value back", "ends the program", "creates a variable"],
        answer: 1
      }
    ],
    challenge: {
      desc: "write a function that takes a list of numbers and returns the average.",
      solution: 'def average(nums):\n    return sum(nums) / len(nums)\n\nprint(average([1, 2, 3, 4, 5]))',
      hint: "use sum() and len() inside the function"
    }
  },
  {
    id: "lambdas",
    title: "lambda functions",
    group: "functions",
    groupLabel: "functions",
    lesson: `
      <span class="lesson-tag">chapter 4 - functions</span>
      <h2>lambda functions</h2>
      <p>lambdas are tiny one-line functions.</p>
      <div class="code-block"><span class="cmt"># normal function</span>
<span class="kw">def</span> <span class="fn">double</span>(x):
    <span class="kw">return</span> x * <span class="num">2</span>

<span class="cmt"># lambda equivalent</span>
double = <span class="kw">lambda</span> x: x * <span class="num">2</span>

<span class="fn">print</span>(<span class="fn">double</span>(<span class="num">5</span>))  <span class="cmt"># 10</span></div>
      <h3>used with map, filter, sorted</h3>
      <div class="code-block"><span class="cmt"># map - apply function to every item</span>
nums = [<span class="num">1</span>, <span class="num">2</span>, <span class="num">3</span>]
doubled = <span class="fn">list</span>(<span class="fn">map</span>(<span class="kw">lambda</span> x: x * <span class="num">2</span>, nums))
<span class="cmt"># [2, 4, 6]</span>

<span class="cmt"># filter - keep items that pass test</span>
evens = <span class="fn">list</span>(<span class="fn">filter</span>(<span class="kw">lambda</span> x: x % <span class="num">2</span> == <span class="num">0</span>, nums))

<span class="cmt"># sorted with key</span>
words = [<span class="str">"banana"</span>, <span class="str">"apple"</span>, <span class="str">"cherry"</span>]
<span class="fn">sorted</span>(words, key=<span class="kw">lambda</span> w: <span class="fn">len</span>(w))</div>
    `,
    quiz: [
      {
        q: "what is a lambda?",
        options: ["a type of loop", "an anonymous function", "a variable type", "a class"],
        answer: 1
      },
      {
        q: "which uses a lambda as an argument?",
        options: ["print()", "map()", "input()", "type()"],
        answer: 1
      }
    ],
    challenge: {
      desc: "use sorted() with a lambda key to sort this list by the second element: pairs = [(1,'b'), (3,'a'), (2,'c')]",
      solution: 'pairs = [(1,"b"), (3,"a"), (2,"c")]\nresult = sorted(pairs, key=lambda x: x[1])\nprint(result)',
      hint: "use key=lambda x: x[1]"
    }
  },
  {
    id: "files",
    title: "file I/O",
    group: "advanced",
    groupLabel: "advanced",
    lesson: `
      <span class="lesson-tag">chapter 5 - advanced</span>
      <h2>file I/O</h2>
      <p>python can read and write files.</p>
      <div class="code-block"><span class="cmt"># writing</span>
<span class="kw">with</span> <span class="fn">open</span>(<span class="str">"data.txt"</span>, <span class="str">"w"</span>) <span class="kw">as</span> f:
    f.write(<span class="str">"hello\\n"</span>)
    f.write(<span class="str">"world\\n"</span>)

<span class="cmt"># reading entire file</span>
<span class="kw">with</span> <span class="fn">open</span>(<span class="str">"data.txt"</span>, <span class="str">"r"</span>) <span class="kw">as</span> f:
    content = f.read()
    <span class="fn">print</span>(content)

<span class="cmt"># reading line by line</span>
<span class="kw">with</span> <span class="fn">open</span>(<span class="str">"data.txt"</span>, <span class="str">"r"</span>) <span class="kw">as</span> f:
    <span class="kw">for</span> line <span class="kw">in</span> f:
        <span class="fn">print</span>(line.strip())</div>
      <h3>modes</h3>
      <div class="code-block"><span class="str">"r"</span>  <span class="cmt"># read (default)</span>
<span class="str">"w"</span>  <span class="cmt"># write (overwrites)</span>
<span class="str">"a"</span>  <span class="cmt"># append</span>
<span class="str">"r+"</span> <span class="cmt"># read and write</span></div>
      <div class="tip-box"><strong>tip:</strong> always use <code>with</code> to open files. it closes them automatically.</div>
    `,
    quiz: [
      {
        q: "what does 'w' mode do if the file exists?",
        options: ["reads it", "appends to it", "overwrites it", "deletes it"],
        answer: 2
      },
      {
        q: "why use 'with' when opening files?",
        options: ["it's faster", "it auto-closes", "it creates backups", "it encrypts"],
        answer: 1
      }
    ],
    challenge: {
      desc: "write 3 lines to a file, then read it back and print each line.",
      solution: 'with open("test.txt", "w") as f:\n    f.write("line 1\\n")\n    f.write("line 2\\n")\n    f.write("line 3\\n")\n\nwith open("test.txt", "r") as f:\n    for line in f:\n        print(line.strip())',
      hint: "use open() with 'w' then 'r'"
    }
  },
  {
    id: "classes",
    title: "classes & objects",
    group: "advanced",
    groupLabel: "advanced",
    lesson: `
      <span class="lesson-tag">chapter 5 - advanced</span>
      <h2>classes & objects</h2>
      <p>classes are blueprints for creating objects.</p>
      <div class="code-block"><span class="kw">class</span> <span class="fn">Dog</span>:
    <span class="kw">def</span> <span class="fn">__init__</span>(self, name, age):
        self.name = name
        self.age = age

    <span class="kw">def</span> <span class="fn">bark</span>(self):
        <span class="fn">print</span>(<span class="str">f"</span>{self.name}<span class="str"> says woof!"</span>)

    <span class="kw">def</span> <span class="fn">info</span>(self):
        <span class="fn">print</span>(<span class="str">f"</span>{self.name}<span class="str"> is </span>{self.age}<span class="str"> years old"</span>)</div>
      <h3>creating objects</h3>
      <div class="code-block">dog1 = <span class="fn">Dog</span>(<span class="str">"rex"</span>, <span class="num">5</span>)
dog2 = <span class="fn">Dog</span>(<span class="str">"buddy"</span>, <span class="num">3</span>)

dog1.bark()   <span class="cmt"># rex says woof!</span>
dog2.info()   <span class="cmt"># buddy is 3 years old</span></div>
      <h3>inheritance</h3>
      <div class="code-block"><span class="kw">class</span> <span class="fn">Puppy</span>(Dog):
    <span class="kw">def</span> <span class="fn">play</span>(self):
        <span class="fn">print</span>(<span class="str">f"</span>{self.name}<span class="str"> is playing!"</span>)

pup = <span class="fn">Puppy</span>(<span class="str">"max"</span>, <span class="num">1</span>)
pup.bark()  <span class="cmt"># max says woof!</span>
pup.play()  <span class="cmt"># max is playing!</span></div>
    `,
    quiz: [
      {
        q: "what does __init__ do?",
        options: ["destroys the object", "initializes the object", "copies the object", "prints the object"],
        answer: 1
      },
      {
        q: "what is self?",
        options: ["the class itself", "the current instance", "a keyword", "a parent class"],
        answer: 1
      }
    ],
    challenge: {
      desc: "create a Person class with name and age. add a method greet() that prints 'hi, I'm {name}'.",
      solution: 'class Person:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n\n    def greet(self):\n        print(f"hi, I\'m {self.name}")\n\np = Person("sloth", 25)\np.greet()',
      hint: "use __init__ for setup and define greet as a method"
    }
  },
  {
    id: "errors",
    title: "error handling",
    group: "advanced",
    groupLabel: "advanced",
    lesson: `
      <span class="lesson-tag">chapter 5 - advanced</span>
      <h2>error handling</h2>
      <p>try/except catches errors so your program doesn't crash.</p>
      <div class="code-block"><span class="kw">try</span>:
    num = <span class="fn">int</span>(<span class="fn">input</span>(<span class="str">"enter a number: "</span>))
    result = <span class="num">10</span> / num
    <span class="fn">print</span>(result)
<span class="kw">except</span> <span class="fn">ValueError</span>:
    <span class="fn">print</span>(<span class="str">"that's not a number!"</span>)
<span class="kw">except</span> <span class="fn">ZeroDivisionError</span>:
    <span class="fn">print</span>(<span class="str">"can't divide by zero!"</span>)
<span class="kw">except</span> <span class="fn">Exception</span> <span class="kw">as</span> e:
    <span class="fn">print</span>(<span class="str">f"error: </span>{e}<span class="str">"</span>)
<span class="kw">finally</span>:
    <span class="fn">print</span>(<span class="str">"done"</span>)</div>
      <h3>common errors</h3>
      <div class="code-block"><span class="fn">ValueError</span>      <span class="cmt"># wrong type conversion</span>
<span class="fn">TypeError</span>       <span class="cmt"># wrong type operation</span>
<span class="fn">IndexError</span>      <span class="cmt"># index out of range</span>
<span class="fn">KeyError</span>        <span class="cmt"># dict key not found</span>
<span class="fn">FileNotFoundError</span> <span class="cmt"># file doesn't exist</span>
<span class="fn">ZeroDivisionError</span> <span class="cmt"># divide by zero</span></div>
      <h3>raising errors</h3>
      <div class="code-block"><span class="kw">def</span> <span class="fn">set_age</span>(age):
    <span class="kw">if</span> age &lt; <span class="num">0</span>:
        <span class="kw">raise</span> <span class="fn">ValueError</span>(<span class="str">"age can't be negative"</span>)
    <span class="kw">return</span> age</div>
    `,
    quiz: [
      {
        q: "what happens if no except matches the error?",
        options: ["it's ignored", "the program crashes", "it retries", "returns None"],
        answer: 1
      },
      {
        q: "what does finally do?",
        options: ["runs if error", "runs if no error", "always runs", "never runs"],
        answer: 2
      }
    ],
    challenge: {
      desc: "write a function that divides two numbers, handling TypeError and ZeroDivisionError.",
      solution: 'def safe_divide(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        print("cannot divide by zero")\n    except TypeError:\n        print("invalid types")\n\nprint(safe_divide(10, 2))\nprint(safe_divide(10, 0))',
      hint: "wrap division in try/except"
    }
  },
  {
    id: "modules",
    title: "modules & imports",
    group: "advanced",
    groupLabel: "advanced",
    lesson: `
      <span class="lesson-tag">chapter 5 - advanced</span>
      <h2>modules & imports</h2>
      <p>modules are python files you can import and use.</p>
      <div class="code-block"><span class="cmt"># import entire module</span>
<span class="kw">import</span> math
<span class="fn">print</span>(math.sqrt(<span class="num">16</span>))  <span class="cmt"># 4.0</span>
<span class="fn">print</span>(math.pi)         <span class="cmt"># 3.14159...</span>

<span class="cmt"># import specific items</span>
<span class="kw">from</span> math <span class="kw">import</span> sqrt, pi
<span class="fn">print</span>(<span class="fn">sqrt</span>(<span class="num">16</span>))

<span class="cmt"># import with alias</span>
<span class="kw">import</span> math <span class="kw">as</span> m
<span class="fn">print</span>(m.floor(<span class="num">3.7</span>))  <span class="cmt"># 3</span></div>
      <h3>common modules</h3>
      <div class="code-block"><span class="kw">import</span> random
random.randint(<span class="num">1</span>, <span class="num">10</span>)  <span class="cmt"># random int 1-10</span>
random.choice([<span class="num">1</span>,<span class="num">2</span>,<span class="num">3</span>]) <span class="cmt"># random item</span>

<span class="kw">import</span> datetime
now = datetime.datetime.now()

<span class="kw">import</span> os
os.listdir(<span class="str">"."</span>)  <span class="cmt"># list files</span></div>
      <h3>making your own module</h3>
      <div class="code-block"><span class="cmt"># mymodule.py</span>
<span class="kw">def</span> <span class="fn">hello</span>():
    <span class="fn">print</span>(<span class="str">"hello from mymodule!"</span>)

<span class="cmt"># main.py</span>
<span class="kw">from</span> mymodule <span class="kw">import</span> hello
<span class="fn">hello</span>()</div>
    `,
    quiz: [
      {
        q: "what does 'import math' do?",
        options: ["creates math.py", "makes math functions available", "downloads math", "deletes math"],
        answer: 1
      },
      {
        q: "what does 'from math import sqrt' do?",
        options: ["imports everything", "imports only sqrt", "creates sqrt", "removes sqrt"],
        answer: 1
      }
    ],
    challenge: {
      desc: "import random and use it to generate 5 random numbers between 1 and 100, printing each.",
      solution: 'import random\nfor i in range(5):\n    print(random.randint(1, 100))',
      hint: "import random, then use random.randint(1, 100)"
    }
  },
  {
    id: "comprehensions2",
    title: "dict & set comprehensions",
    group: "collections",
    groupLabel: "collections",
    lesson: `
      <span class="lesson-tag">chapter 3 - collections</span>
      <h2>dict & set comprehensions</h2>
      <p>like list comprehensions, but for dicts and sets.</p>
      <h3>dict comprehension</h3>
      <div class="code-block"><span class="cmt"># squares dict</span>
squares = {x: x**<span class="num">2</span> <span class="kw">for</span> x <span class="kw">in</span> <span class="fn">range</span>(<span class="num">5</span>)}
<span class="cmt"># {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}</span>

<span class="cmt"># from two lists</span>
keys = [<span class="str">"a"</span>, <span class="str">"b"</span>, <span class="str">"c"</span>]
vals = [<span class="num">1</span>, <span class="num">2</span>, <span class="num">3</span>]
d = {k: v <span class="kw">for</span> k, v <span class="kw">in</span> <span class="fn">zip</span>(keys, vals)}
<span class="cmt"># {'a': 1, 'b': 2, 'c': 3}</span></div>
      <h3>set comprehension</h3>
      <div class="code-block">nums = [<span class="num">1</span>, <span class="num">2</span>, <span class="num">2</span>, <span class="num">3</span>, <span class="num">3</span>, <span class="num">3</span>]
unique = {x <span class="kw">for</span> x <span class="kw">in</span> nums}
<span class="cmt"># {1, 2, 3}</span></div>
      <h3>generator expression</h3>
      <div class="code-block"><span class="cmt"># uses () instead of [] - lazy evaluation</span>
gen = (x**<span class="num">2</span> <span class="kw">for</span> x <span class="kw">in</span> <span class="fn">range</span>(<span class="num">1000000</span>))
<span class="fn">sum</span>(gen)  <span class="cmt"># memory efficient!</span></div>
    `,
    quiz: [
      {
        q: "what's the difference between {x: x for x in range(3)} and [x for x in range(3)]?",
        options: ["same thing", "first is dict, second is list", "first is set, second is list", "error"],
        answer: 1
      },
      {
        q: "what does zip() do?",
        options: ["compresses files", "combines iterables", "sorts lists", "removes duplicates"],
        answer: 1
      }
    ],
    challenge: {
      desc: "create a dict that maps numbers 1-10 to their squares using a dict comprehension.",
      solution: 'squares = {x: x**2 for x in range(1, 11)}\nprint(squares)',
      hint: "use {x: x**2 for x in range(1, 11)}"
    }
  },
  {
    id: "decorators",
    title: "decorators",
    group: "advanced",
    groupLabel: "advanced",
    lesson: `
      <span class="lesson-tag">chapter 5 - advanced</span>
      <h2>decorators</h2>
      <p>decorators modify functions. they're functions that wrap other functions.</p>
      <div class="code-block"><span class="kw">def</span> <span class="fn">timer</span>(func):
    <span class="kw">def</span> <span class="fn">wrapper</span>(*args, **kwargs):
        <span class="kw">import</span> time
        start = time.time()
        result = <span class="fn">func</span>(*args, **kwargs)
        end = time.time()
        <span class="fn">print</span>(<span class="str">f"</span>{func.__name__}<span class="str"> took </span>{end-start:<span class="str">.4f}s"</span>)
        <span class="kw">return</span> result
    <span class="kw">return</span> wrapper

<span class="kw">@timer</span>
<span class="kw">def</span> <span class="fn">slow_add</span>(a, b):
    <span class="kw">import</span> time
    time.sleep(<span class="num">1</span>)
    <span class="kw">return</span> a + b

<span class="fn">slow_add</span>(<span class="num">1</span>, <span class="num">2</span>)  <span class="cmt"># prints: slow_add took 1.0012s</span></div>
      <h3>@ syntax</h3>
      <div class="code-block"><span class="cmt"># @decorator is same as:</span>
my_func = <span class="fn">decorator</span>(my_func)

<span class="cmt"># common built-in decorators</span>
<span class="kw">@staticmethod</span>
<span class="kw">@classmethod</span>
<span class="kw">@property</span></div>
    `,
    quiz: [
      {
        q: "what does a decorator do?",
        options: ["deletes functions", "modifies functions", "creates classes", "imports modules"],
        answer: 1
      },
      {
        q: "what does @ before a function mean?",
        options: ["it's a comment", "apply a decorator", "it's deprecated", "make it private"],
        answer: 1
      }
    ],
    challenge: {
      desc: "write a decorator that prints 'BEFORE' before a function runs and 'AFTER' after it runs.",
      solution: 'def log(func):\n    def wrapper(*args, **kwargs):\n        print("BEFORE")\n        result = func(*args, **kwargs)\n        print("AFTER")\n        return result\n    return wrapper\n\n@log\ndef say_hello():\n    print("hello!")\n\nsay_hello()',
      hint: "create a wrapper function that prints before and after calling the original"
    }
  }
];
