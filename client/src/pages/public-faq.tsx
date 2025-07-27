import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Search, Mail, MessageSquare, ArrowRight } from "lucide-react";
import { faqs, faqCategories, type FAQ } from "@/data/faqs";

export default function PublicFAQ() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Show only basic categories for public users
  const publicCategories = faqCategories.filter(cat => 
    ['all', 'general', 'file-upload', 'pricing', 'security', 'technical'].includes(cat.id)
  );

  // Filter FAQs based on search and category
  const filteredFAQs = faqs.filter((faq: FAQ) => {
    const matchesSearch = searchQuery === "" || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    
    // Show public categories only
    const isPublicCategory = publicCategories.some(cat => cat.id === faq.category);
    
    return matchesSearch && matchesCategory && isPublicCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <h1 className="text-xl font-bold">FAQ</h1>
            </div>
            
            <Button onClick={() => setLocation('/auth')}>
              Sign In <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">
            Find answers to common questions about IndieShots
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {publicCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="mb-8">
          {filteredFAQs.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-4">
              {filteredFAQs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-4">
                      <span className="font-medium">{faq.question}</span>
                      <Badge variant="secondary" className="ml-2">
                        {faqCategories.find(cat => cat.id === faq.category)?.label}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-medium mb-2">No FAQs found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or selecting a different category.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sign In Prompt */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
            <CardDescription>
              Sign in to access our full help center with advanced features, AI tools documentation, and priority support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/auth')}>
              Sign In to Access Full Help Center
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Still have questions?
            </CardTitle>
            <CardDescription>
              Can't find what you're looking for? Our support team is here to help.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="mailto:indieshots@theindierise.com" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Support
              </a>
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Pro users receive priority support with faster response times.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}