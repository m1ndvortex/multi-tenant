/**
 * Test component to verify cybersecurity theme UI components
 */

import React from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Badge } from './badge';
import { Progress } from './progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Checkbox } from './checkbox';
import { Switch } from './switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';

export const CyberThemeTest: React.FC = () => {
  return (
    <div className="p-8 space-y-8 bg-cyber-bg-primary min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-cyber-neon-primary cyber-text-glow font-accent">
            Cybersecurity Theme Test
          </h1>
          <p className="text-cyber-text-muted">
            Testing all UI components with the new cybersecurity theme
          </p>
        </div>

        {/* Buttons */}
        <Card variant="cyber-glass">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Various button variants with cybersecurity styling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="cyber-primary">Primary</Button>
              <Button variant="cyber-secondary">Secondary</Button>
              <Button variant="cyber-danger">Danger</Button>
              <Button variant="cyber-ghost">Ghost</Button>
              <Button variant="default">Default</Button>
              <Button variant="outline">Outline</Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card variant="cyber-glass">
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Input fields, selects, and form controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Enter text..." />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="checkbox1" />
                <label htmlFor="checkbox1" className="text-cyber-text-primary">Checkbox</label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="switch1" />
                <label htmlFor="switch1" className="text-cyber-text-primary">Switch</label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges and Progress */}
        <Card variant="cyber-glass">
          <CardHeader>
            <CardTitle>Badges & Progress</CardTitle>
            <CardDescription>Status indicators and progress bars</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="cyber-primary">Primary</Badge>
              <Badge variant="cyber-secondary">Secondary</Badge>
              <Badge variant="cyber-danger">Danger</Badge>
              <Badge variant="cyber-warning">Warning</Badge>
              <Badge variant="cyber-info">Info</Badge>
              <Badge variant="cyber-success">Success</Badge>
              <Badge variant="cyber-glass">Glass</Badge>
            </div>
            <div className="space-y-2">
              <Progress variant="cyber" value={75} />
              <Progress variant="success" value={60} />
              <Progress variant="warning" value={40} />
              <Progress variant="danger" value={25} />
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              This is an informational alert with cybersecurity styling.
            </AlertDescription>
          </Alert>
          
          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Operation completed successfully.
            </AlertDescription>
          </Alert>
          
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Please review this warning message.
            </AlertDescription>
          </Alert>
          
          <Alert variant="destructive">
            <Zap className="h-4 w-4" />
            <AlertTitle>Critical Alert</AlertTitle>
            <AlertDescription>
              This is a critical security alert.
            </AlertDescription>
          </Alert>
        </div>

        {/* Tabs */}
        <Card variant="cyber-glass">
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>Tabbed navigation with cybersecurity theme</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tab1" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tab1">Security</TabsTrigger>
                <TabsTrigger value="tab2">Monitoring</TabsTrigger>
                <TabsTrigger value="tab3">Analytics</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="mt-4">
                <p className="text-cyber-text-secondary">Security dashboard content goes here.</p>
              </TabsContent>
              <TabsContent value="tab2" className="mt-4">
                <p className="text-cyber-text-secondary">Real-time monitoring data.</p>
              </TabsContent>
              <TabsContent value="tab3" className="mt-4">
                <p className="text-cyber-text-secondary">Analytics and reports.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Card variant="cyber-glass">
          <CardHeader>
            <CardTitle>Dialog</CardTitle>
            <CardDescription>Modal dialogs with glassmorphism effects</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="cyber-primary">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cybersecurity Dialog</DialogTitle>
                  <DialogDescription>
                    This dialog demonstrates the glassmorphism effect with neon accents.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Enter security key..." />
                  <div className="flex justify-end space-x-2">
                    <Button variant="cyber-ghost">Cancel</Button>
                    <Button variant="cyber-primary">Confirm</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default CyberThemeTest;