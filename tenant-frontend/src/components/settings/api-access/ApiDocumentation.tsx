import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Play, 
  Code, 
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle,
  AlertCircle,
  Book,
  Zap
} from 'lucide-react';
import { apiAccessService, ApiDocumentation as ApiDocs } from '@/services/apiAccessService';
import { useToast } from '@/hooks/use-toast';

const ApiDocumentation: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testParameters, setTestParameters] = useState<Record<string, any>>({});
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const { data: documentation, isLoading } = useQuery({
    queryKey: ['api-documentation'],
    queryFn: () => apiAccessService.getApiDocumentation(),
  });

  const testEndpointMutation = useMutation({
    mutationFn: ({ endpoint, method, parameters }: { endpoint: string; method: string; parameters: any }) =>
      apiAccessService.testApiEndpoint(endpoint, method, parameters),
    onSuccess: (result, variables) => {
      const key = `${variables.method}:${variables.endpoint}`;
      setTestResults(prev => ({ ...prev, [key]: result }));
      setTestingEndpoint(null);
      toast({
        title: 'تست API موفق',
        description: 'درخواست با موفقیت ارسال شد.',
      });
    },
    onError: (error: any, variables) => {
      const key = `${variables.method}:${variables.endpoint}`;
      setTestResults(prev => ({ 
        ...prev, 
        [key]: { error: error.message || 'خطا در ارسال درخواست' }
      }));
      setTestingEndpoint(null);
      toast({
        title: 'خطا در تست API',
        description: error.message || 'خطایی در ارسال درخواست رخ داد.',
        variant: 'destructive',
      });
    },
  });

  const toggleEndpoint = (endpointKey: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(endpointKey)) {
      newExpanded.delete(endpointKey);
    } else {
      newExpanded.add(endpointKey);
    }
    setExpandedEndpoints(newExpanded);
  };

  const handleTestEndpoint = (endpoint: string, method: string) => {
    const key = `${method}:${endpoint}`;
    setTestingEndpoint(key);
    const parameters = testParameters[key] || {};
    testEndpointMutation.mutate({ endpoint, method, parameters });
  };

  const updateTestParameter = (endpointKey: string, paramName: string, value: any) => {
    setTestParameters(prev => ({
      ...prev,
      [endpointKey]: {
        ...prev[endpointKey],
        [paramName]: value
      }
    }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'کپی شد',
        description: 'کد در کلیپ‌بورد کپی شد.',
      });
    } catch (error) {
      toast({
        title: 'خطا در کپی',
        description: 'امکان کپی کردن وجود ندارد.',
        variant: 'destructive',
      });
    }
  };

  const getMethodBadge = (method: string) => {
    const colors = {
      GET: 'bg-green-100 text-green-800',
      POST: 'bg-blue-100 text-blue-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      PATCH: 'bg-purple-100 text-purple-800',
    };
    return (
      <Badge className={`${colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'} font-mono`}>
        {method}
      </Badge>
    );
  };

  const filteredEndpoints = documentation?.endpoints.filter(endpoint => {
    const matchesSearch = endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = selectedMethod === 'all' || endpoint.method === selectedMethod;
    return matchesSearch && matchesMethod;
  }) || [];

  if (isLoading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
            <span className="mr-2 text-gray-600">در حال بارگذاری مستندات...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">مستندات API</h2>
          <p className="text-sm text-gray-600 mt-1">راهنمای کامل استفاده از API با امکان تست مستقیم</p>
        </div>
      </div>

      {/* Quick Start Guide */}
      <Card variant="gradient-purple">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">شروع سریع</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <p>1. ابتدا یک کلید API از بخش "کلیدهای API" ایجاد کنید</p>
                <p>2. کلید را در هدر Authorization درخواست‌های خود قرار دهید</p>
                <p>3. از مستندات زیر برای آشنایی با endpoint های مختلف استفاده کنید</p>
              </div>
              <div className="mt-3 p-3 bg-white/20 rounded-lg">
                <code className="text-xs text-gray-800">
                  Authorization: Bearer YOUR_API_KEY
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY')}
                  className="mr-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card variant="filter">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="جستجو در endpoint ها..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع درخواست" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <div className="space-y-4">
        {filteredEndpoints.length === 0 ? (
          <Card variant="professional">
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">endpoint ای یافت نشد</h3>
              <p className="text-gray-600">
                {searchTerm || selectedMethod !== 'all' 
                  ? 'فیلترهای خود را تغییر دهید تا endpoint های بیشتری ببینید.'
                  : 'مستندات API در حال بارگذاری است...'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEndpoints.map((endpoint) => {
            const endpointKey = `${endpoint.method}:${endpoint.path}`;
            const isExpanded = expandedEndpoints.has(endpointKey);
            const isTesting = testingEndpoint === endpointKey;
            const testResult = testResults[endpointKey];

            return (
              <Card key={endpointKey} variant="professional">
                <CardContent className="p-0">
                  {/* Endpoint Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleEndpoint(endpointKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        {getMethodBadge(endpoint.method)}
                        <code className="text-sm font-mono text-gray-800">{endpoint.path}</code>
                      </div>
                      <div className="text-sm text-gray-600">{endpoint.description}</div>
                    </div>
                  </div>

                  {/* Endpoint Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      <Tabs defaultValue="parameters" className="w-full">
                        <div className="px-4 pt-4">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="parameters">پارامترها</TabsTrigger>
                            <TabsTrigger value="responses">پاسخ‌ها</TabsTrigger>
                            <TabsTrigger value="test">تست</TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="parameters" className="p-4 pt-2">
                          {endpoint.parameters.length === 0 ? (
                            <p className="text-sm text-gray-600 text-center py-4">
                              این endpoint پارامتری ندارد
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {endpoint.parameters.map((param) => (
                                <div key={param.name} className="border rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                      {param.name}
                                    </code>
                                    <Badge variant={param.required ? 'destructive' : 'secondary'} className="text-xs">
                                      {param.required ? 'اجباری' : 'اختیاری'}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {param.type}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">{param.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="responses" className="p-4 pt-2">
                          <div className="space-y-3">
                            {endpoint.responses.map((response) => (
                              <div key={response.status} className="border rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge 
                                    variant={response.status < 300 ? 'default' : 'destructive'}
                                    className="font-mono"
                                  >
                                    {response.status}
                                  </Badge>
                                  <span className="text-sm text-gray-600">{response.description}</span>
                                </div>
                                {response.schema && (
                                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(response.schema, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="test" className="p-4 pt-2">
                          <div className="space-y-4">
                            {/* Test Parameters */}
                            {endpoint.parameters.length > 0 && (
                              <div>
                                <Label className="text-sm font-medium mb-2 block">پارامترهای تست:</Label>
                                <div className="space-y-2">
                                  {endpoint.parameters.map((param) => (
                                    <div key={param.name}>
                                      <Label className="text-xs text-gray-600">{param.name}</Label>
                                      <Input
                                        placeholder={`مقدار ${param.name}`}
                                        value={testParameters[endpointKey]?.[param.name] || ''}
                                        onChange={(e) => updateTestParameter(endpointKey, param.name, e.target.value)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Test Button */}
                            <Button
                              onClick={() => handleTestEndpoint(endpoint.path, endpoint.method)}
                              disabled={isTesting}
                              variant="gradient-green"
                              className="w-full"
                            >
                              {isTesting ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  در حال ارسال...
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 ml-2" />
                                  تست endpoint
                                </>
                              )}
                            </Button>

                            {/* Test Results */}
                            {testResult && (
                              <div className="mt-4">
                                <Label className="text-sm font-medium mb-2 block">نتیجه تست:</Label>
                                <div className={`border rounded-lg p-3 ${
                                  testResult.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                                }`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    {testResult.error ? (
                                      <AlertCircle className="h-4 w-4 text-red-600" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    )}
                                    <span className={`text-sm font-medium ${
                                      testResult.error ? 'text-red-800' : 'text-green-800'
                                    }`}>
                                      {testResult.error ? 'خطا' : 'موفق'}
                                    </span>
                                  </div>
                                  <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                                    {JSON.stringify(testResult, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ApiDocumentation;