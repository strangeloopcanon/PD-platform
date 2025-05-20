import React, { useState, useEffect, useRef } from 'react';
import { Play, Save, PlusCircle, CheckCircle, Code, FileText, Trash2, Download, Upload, ChevronRight, Lightbulb, CheckCircle2, AlignLeft, RefreshCw, BarChart3, LineChart, PieChart, File, GitBranch, Clock, Edit3, Check, X, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Editor from '@monaco-editor/react';
import toast, { Toaster } from 'react-hot-toast';

interface NotebookCell {
  id: string;
  type: 'code' | 'markdown';
  content: string;
  output?: any;
  isExecuting?: boolean;
  isActive: boolean;
}

const NotebookPage: React.FC = () => {
  const { connectionStatus, selectedDataFrame, setSelectedDataFrame } = useAppContext();
  const [notebookName, setNotebookName] = useState<string>('Untitled Notebook');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(true);
  const [copilotQuery, setCopilotQuery] = useState<string>('');
  const [loadingCopilotSuggestion, setLoadingCopilotSuggestion] = useState(false);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [pyodide, setPyodide] = useState<any>(null);
  const dfRef = useRef<any | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // @ts-ignore
        const py = await (window as any).loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" });
        // Load micropip package itself
        await py.loadPackage(["micropip"]);
        // Now, run Python code to import micropip and then install seaborn with it
        await py.runPythonAsync(`
          import micropip
          await micropip.install('seaborn')
        `);
        // Load other packages that are directly available
        await py.loadPackage(["pandas", "matplotlib"]);
        setPyodide(py);
      } catch (e) {
        console.error("Failed to load pyodide or packages", e);
      }
    };
    init();
  }, []);

  // Initial cells
  const [cells, setCells] = useState<NotebookCell[]>([
    {
      id: '1',
      type: 'markdown',
      content: '# Data Analysis Notebook\n\nThis notebook demonstrates how to analyze the results from our query using Python and plotting libraries.',
      isActive: false,
    },
    {
      id: '2',
      type: 'code',
      content: '# Import libraries\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n\n# Set plot style\nsns.set(style="whitegrid")\nplt.rcParams["figure.figsize"] = (10, 6)',
      isActive: false,
    },
    {
      id: '3',
      type: 'code',
      content: '# Load data from our previous query\ndf = pd.DataFrame({\n    "category": ["Electronics", "Home & Kitchen", "Clothing", "Sports & Outdoors", "Beauty & Personal Care", "Books", "Toys & Games"],\n    "total_sales": [527350.75, 423150.25, 356280.50, 289750.00, 157680.75, 98540.25, 76520.50]\n})\n\ndf.head()',
      output: `   category  total_sales
0  Electronics   527350.75
1  Home & Kitchen   423150.25
2  Clothing   356280.50
3  Sports & Outdoors   289750.00
4  Beauty & Personal Care   157680.75`,
      isActive: true,
    },
    {
      id: '4',
      type: 'markdown',
      content: '## Sales Analysis\n\nLet\'s visualize the sales data by category with a bar chart to identify top performing categories.',
      isActive: false,
    },
    {
      id: '5',
      type: 'code',
      content: '# Create a bar chart of total sales by category\nplt.figure(figsize=(12, 6))\nsns.barplot(x="category", y="total_sales", data=df.sort_values("total_sales", ascending=False), palette="viridis")\nplt.title("Total Sales by Product Category", fontsize=16)\nplt.xlabel("Category", fontsize=12)\nplt.ylabel("Total Sales ($)", fontsize=12)\nplt.xticks(rotation=45)\nplt.tight_layout()\nplt.show()',
      output: { type: 'image', url: 'https://images.pexels.com/photos/7567434/pexels-photo-7567434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' },
      isActive: false,
    },
  ]);

  // Set initial active cell ID
  useEffect(() => {
    const active = cells.find(c => c.isActive);
    if (active) {
      setActiveCellId(active.id);
    }
  }, []);

  // Effect to add cell with data from query page and seed Pyodide
  useEffect(() => {
    if (selectedDataFrame) {
      dfRef.current = selectedDataFrame;
      const newCell: NotebookCell = {
        id: Date.now().toString(),
        type: 'code',
        content: `# Data loaded from Query Page\ndf = pd.DataFrame(${JSON.stringify(selectedDataFrame, null, 2)})\n\ndf.head()`,
        isActive: true,
        isExecuting: false,
        output: undefined
      };
      setCells(prevCells => {
        const updatedCells = prevCells.map(c => ({ ...c, isActive: false }));
        updatedCells.push(newCell);
        return updatedCells;
      });
      setActiveCellId(newCell.id);
    }

    if (pyodide && dfRef.current) {
      try {
        pyodide.runPython(`import pandas as pd\ndf = pd.DataFrame(${JSON.stringify(dfRef.current)})`);
        dfRef.current = null;
        setSelectedDataFrame(null);
      } catch (e) {
        console.error('Failed to seed dataframe', e);
      }
    }
  }, [selectedDataFrame, pyodide, setSelectedDataFrame]);

  const handleCellContentChange = (id: string, content: string) => {
    setCells(cells.map(cell => 
      cell.id === id ? { ...cell, content } : cell
    ));
  };

  const handleCellTypeChange = (id: string, type: 'code' | 'markdown') => {
    setCells(cells.map(cell => 
      cell.id === id ? { ...cell, type, output: undefined } : cell
    ));
  };

  const handleCellActive = (id: string) => {
    setActiveCellId(id);
    setCells(cells.map(cell => 
      ({ ...cell, isActive: cell.id === id })
    ));
  };

  const addCellAfter = (id: string, type: 'code' | 'markdown' = 'code') => {
    const index = cells.findIndex(cell => cell.id === id);
    const newCell: NotebookCell = {
      id: Date.now().toString(),
      type,
      content: '',
      isActive: true,
      isExecuting: false,
      output: undefined
    };
    
    const newCells = [...cells];
    newCells.splice(index + 1, 0, newCell);
    
    setCells(newCells.map(cell => 
      ({ ...cell, isActive: cell.id === newCell.id })
    ));
    setActiveCellId(newCell.id);
  };

  const deleteCell = (id: string) => {
    if (cells.length <= 1) return;
    
    const index = cells.findIndex(cell => cell.id === id);
    const newCells = cells.filter(cell => cell.id !== id);
    
    let newActiveId: string | null = null;
    if (newCells.length > 0) {
      if (index < newCells.length) {
        newActiveId = newCells[index].id;
      } else {
        newActiveId = newCells[newCells.length - 1].id;
      }
    }

    setCells(newCells.map(cell => ({...cell, isActive: cell.id === newActiveId})) );
    setActiveCellId(newActiveId);
  };

  const executeCell = async (id: string) => {
    if (!pyodide) return;
    let code = '';
    setCells(prevCells => prevCells.map(cell => {
      if (cell.id === id) {
        code = cell.content;
        return { ...cell, isExecuting: true };
      }
      return cell;
    }));

    if (!code) return;

    const escaped = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    try {
      await pyodide.runPythonAsync(`
import sys, io, base64, matplotlib.pyplot as plt
_stdout = io.StringIO()
_stderr = io.StringIO()
old_stdout, old_stderr = sys.stdout, sys.stderr
sys.stdout, sys.stderr = _stdout, _stderr
img_data = None
try:
    exec("""${escaped}""", globals())
    if plt.get_fignums():
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        img_data = base64.b64encode(buf.getvalue()).decode('utf-8')
finally:
    sys.stdout, sys.stderr = old_stdout, old_stderr
output_text = _stdout.getvalue() + _stderr.getvalue()
__cell_result = {'text': output_text, 'image': img_data}
`);
      const result = pyodide.globals.get('__cell_result').toJs({ dict_converter: Object });
      setCells(prevCells => prevCells.map(cell => {
        if (cell.id === id) {
          let out: any = undefined;
          if (result.image) {
            out = { type: 'image', url: `data:image/png;base64,${result.image}` };
          } else if (result.text.trim()) {
            out = result.text;
          }
          return { ...cell, isExecuting: false, output: out };
        }
        return cell;
      }));
    } catch (err) {
      setCells(prevCells => prevCells.map(cell => (
        cell.id === id ? { ...cell, isExecuting: false, output: String(err) } : cell
      )));
    }
  };

  const executeAllCells = () => {
    cells.forEach((cell, index) => {
      if (cell.type === 'code') {
        setTimeout(() => executeCell(cell.id), index * 1000);
      }
    });
  };

  // Mock handler for Save Notebook
  const handleSaveNotebook = () => {
    toast.success('Notebook saved! (Mock)');
  };

  // Mock handler for Download Notebook
  const handleDownloadNotebook = () => {
    toast.success('Notebook download started... (Mock)');
  };

  // Mock handler for Upload Notebook
  const handleUploadNotebook = () => {
    toast.success('Notebook upload successful! (Mock)');
  };

  const handleCopilotSuggestion = (suggestion: string) => {
    // Find the active cell or the last code cell
    const activeCell = cells.find(cell => cell.isActive && cell.type === 'code');
    const lastCodeCell = [...cells].reverse().find(cell => cell.type === 'code');
    const targetCell = activeCell || lastCodeCell;
    
    if (targetCell) {
      let newContent = '';
      
      // Generate mock code based on suggestion
      if (suggestion.includes('bar chart')) {
        newContent = `# Generate bar chart of sales by category
plt.figure(figsize=(12, 6))
ax = sns.barplot(x="category", y="total_sales", data=df, palette="viridis")
plt.title("Sales by Product Category")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()`;
      } else if (suggestion.includes('correlation')) {
        newContent = `# Calculate correlation between order value and customer age
customer_data = pd.DataFrame({
    "customer_age": [25, 34, 29, 48, 52, 31, 42, 39, 45, 28],
    "order_value": [120, 250, 180, 340, 410, 190, 280, 220, 320, 150]
})

# Calculate correlation matrix
correlation = customer_data.corr()
print(correlation)

# Visualize with a heatmap
plt.figure(figsize=(8, 6))
sns.heatmap(correlation, annot=True, cmap="coolwarm", vmin=-1, vmax=1)
plt.title("Correlation Heatmap")
plt.tight_layout()
plt.show()`;
      } else if (suggestion.includes('time series')) {
        newContent = `# Time series analysis on monthly sales
monthly_sales = pd.DataFrame({
    "date": pd.date_range(start="2023-01-01", periods=12, freq="M"),
    "sales": [125000, 140000, 160000, 180000, 210000, 230000, 245000, 240000, 220000, 200000, 190000, 240000]
})

monthly_sales.set_index("date", inplace=True)

# Plot the time series
plt.figure(figsize=(12, 6))
plt.plot(monthly_sales.index, monthly_sales.sales, marker='o', linestyle='-')
plt.title("Monthly Sales (2023)")
plt.xlabel("Month")
plt.ylabel("Sales ($)")
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()`;
      }
      
      setCells(cells.map(cell => 
        cell.id === targetCell.id ? { ...cell, content: newContent, isActive: true } : { ...cell, isActive: false }
      ));
    } else {
      // If no code cell exists, create one
      const newCell: NotebookCell = {
        id: Date.now().toString(),
        type: 'code',
        content: '# Generated from Copilot suggestion\n',
        isActive: true,
      };
      
      setCells([...cells, newCell]);
    }
  };

  if (!connectionStatus) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">Database Connection Required</h2>
          <p className="mt-2 text-sm text-gray-500">
            Please connect to a Snowflake database before using the notebook
          </p>
          <a href="/connect" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
            Connect to Database
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Notebook header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 sm:px-6 flex items-center justify-between">
        <div className="flex items-center">
          {isEditingName ? (
            <div className="flex items-center">
              <input
                type="text"
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-64 sm:text-lg border-gray-300 rounded-md font-medium"
                value={notebookName}
                onChange={(e) => setNotebookName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                autoFocus
              />
              <CheckCircle
                className="ml-2 h-5 w-5 text-primary-600 cursor-pointer"
                onClick={() => setIsEditingName(false)}
              />
            </div>
          ) : (
            <h1
              className="text-xl font-medium text-gray-900 cursor-pointer"
              onClick={() => setIsEditingName(true)}
            >
              {notebookName}
            </h1>
          )}
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Saved
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mock Version History Dropdown */}
           <div className="relative inline-block text-left" title="View notebook version history (Mock)"> {/* Tooltip */} 
              <button type="button" className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 shadow-sm px-3 py-1 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                  <Clock className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                  Latest
                  <ChevronDown className="-mr-1 ml-1 h-4 w-4" />
              </button>
          </div>
          
          <button onClick={handleSaveNotebook} title="Save notebook (Mock)" className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-primary-600 hover:bg-primary-700">
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save
          </button>
          <button onClick={handleDownloadNotebook} title="Download notebook (Mock)" className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
             <Download className="mr-1.5 h-3.5 w-3.5" /> Download
          </button>
           <button onClick={handleUploadNotebook} title="Upload notebook (Mock)" className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
             <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
          </button>
           <button onClick={executeAllCells} title="Run all code cells" className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
             <Play className="mr-1.5 h-3.5 w-3.5" /> Run All
          </button>
        </div>
      </div>

      {/* Main notebook area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Notebook cells */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {cells.map((cell) => (
              <div
                key={cell.id}
                className={`relative group border rounded-md transition-shadow duration-200 ${cell.isActive ? 'border-primary-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => handleCellActive(cell.id)}
              >
                {/* Cell toolbar */}
                <div className={`absolute top-2 right-2 z-10 flex items-center space-x-1 bg-white bg-opacity-80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-gray-200 transition-opacity duration-150 ${cell.isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button onClick={(e) => { e.stopPropagation(); executeCell(cell.id); }} title="Run cell" className="p-1 text-gray-500 hover:text-primary-600 disabled:opacity-50" disabled={cell.type !== 'code' || cell.isExecuting}>
                    {cell.isExecuting ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4" />}
                  </button>
                   <button onClick={(e) => { e.stopPropagation(); handleCellTypeChange(cell.id, cell.type === 'code' ? 'markdown' : 'code'); }} title={`Convert to ${cell.type === 'code' ? 'Markdown' : 'Code'}`} className="p-1 text-gray-500 hover:text-primary-600">
                     {cell.type === 'code' ? <FileText className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                  </button>
                   <button onClick={(e) => { e.stopPropagation(); addCellAfter(cell.id, 'code'); }} title="Add code cell below" className="p-1 text-gray-500 hover:text-primary-600">
                     <PlusCircle className="h-4 w-4" />
                  </button>
                   <button onClick={(e) => { e.stopPropagation(); deleteCell(cell.id); }} title="Delete cell" className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50" disabled={cells.length <= 1}>
                     <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Cell content */}
                <div className="px-4 py-3">
                  <textarea
                    className="w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm font-mono"
                    rows={cell.content.split('\n').length}
                    placeholder={cell.type === 'code' ? "Enter code..." : "Enter markdown..."}
                    value={cell.content}
                    onChange={(e) => handleCellContentChange(cell.id, e.target.value)}
                  ></textarea>
                </div>

                {/* Cell output (for code cells) */}
                {cell.type === 'code' && cell.output && (
                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                    <div className="text-xs text-gray-500 mb-1">Output:</div>
                    {typeof cell.output === 'string' ? (
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono overflow-x-auto">
                        {cell.output}
                      </pre>
                    ) : cell.output.type === 'image' ? (
                      <img 
                        src={cell.output.url} 
                        alt="Output visualization" 
                        className="mt-2 max-w-full h-auto rounded-md"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            ))}

            {/* Add cell button at the end */}
            <div className="flex justify-center">
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={() => addCellAfter(cells[cells.length - 1].id)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Cell
              </button>
            </div>
          </div>
        </div>

        {/* Copilot panel */}
        <div className={`border-l border-gray-200 bg-white ${copilotOpen ? 'w-80' : 'w-10'} transition-all duration-300 flex flex-col`}>
          {copilotOpen ? (
            <>
              <div className="border-b border-gray-200 px-4 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <Lightbulb className="h-5 w-5 text-amber-500 mr-2" />
                  <h3 className="text-sm font-medium text-gray-900">AI Copilot</h3>
                </div>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => setCopilotOpen(false)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                    Code Suggestions
                  </h4>
                  <div className="space-y-2">
                    {[
                      'Plot sales by category using a bar chart',
                      'Calculate correlation between value columns',
                      'Show dataframe summary statistics',
                      'Visualize data distribution with a histogram'
                    ].map((suggestion: string, index: number) => (
                      <button
                        key={index}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md disabled:opacity-70 disabled:cursor-not-allowed"
                        onClick={() => handleCopilotSuggestion(suggestion)}
                        disabled={loadingCopilotSuggestion}
                      >
                        {loadingCopilotSuggestion ? 'Generating...' : suggestion}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6">
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                    Insights
                  </h4>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="flex">
                      <CheckCircle2 className="h-5 w-5 text-blue-400 mr-2" />
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Data Quality Analysis</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Your dataset is complete with no missing values. Consider adding time-based analysis to identify trends.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <button
              className="flex items-center justify-center h-full w-full hover:bg-gray-50"
              onClick={() => setCopilotOpen(true)}
            >
              <Lightbulb className="h-5 w-5 text-amber-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotebookPage;
