"use client";

/**
 * Payment Section
 * 
 * Allows users to manage their payment details for revenue payouts.
 * Supports PayPal, Bank Transfer, and Wise.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Building2, Wallet, CheckCircle } from "lucide-react";

interface PaymentDetails {
  id: string;
  preferredMethod: string;
  paypalEmail: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  iban: string | null;
  swiftBic: string | null;
  bankAddress: string | null;
  bankCurrency: string | null;
  wiseEmail: string | null;
}

interface PaymentSectionProps {
  paymentDetails: PaymentDetails | null;
  userId: string;
}

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "INR", label: "INR - Indian Rupee" },
];

export function PaymentSection({ paymentDetails, userId }: PaymentSectionProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [preferredMethod, setPreferredMethod] = useState(paymentDetails?.preferredMethod || "paypal");
  const [paypalEmail, setPaypalEmail] = useState(paymentDetails?.paypalEmail || "");
  const [bankAccountName, setBankAccountName] = useState(paymentDetails?.bankAccountName || "");
  const [bankName, setBankName] = useState(paymentDetails?.bankName || "");
  const [iban, setIban] = useState(paymentDetails?.iban || "");
  const [swiftBic, setSwiftBic] = useState(paymentDetails?.swiftBic || "");
  const [bankAddress, setBankAddress] = useState(paymentDetails?.bankAddress || "");
  const [bankCurrency, setBankCurrency] = useState(paymentDetails?.bankCurrency || "USD");
  const [wiseEmail, setWiseEmail] = useState(paymentDetails?.wiseEmail || "");

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredMethod,
          paypalEmail: paypalEmail || null,
          bankAccountName: bankAccountName || null,
          bankName: bankName || null,
          iban: iban || null,
          swiftBic: swiftBic || null,
          bankAddress: bankAddress || null,
          bankCurrency: bankCurrency || null,
          wiseEmail: wiseEmail || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save payment details");
      }

      setMessage({ type: "success", text: "Payment details saved successfully!" });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save payment details",
      });
    } finally {
      setSaving(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "paypal":
        return <Wallet className="h-4 w-4" />;
      case "bank":
        return <Building2 className="h-4 w-4" />;
      case "wise":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
        <CardDescription>
          Configure how you want to receive your revenue payouts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preferred Method */}
        <div className="space-y-2">
          <Label>Preferred Payment Method</Label>
          <Select value={preferredMethod} onValueChange={setPreferredMethod}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paypal">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  PayPal
                </div>
              </SelectItem>
              <SelectItem value="bank">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bank Transfer
                </div>
              </SelectItem>
              <SelectItem value="wise">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Wise (TransferWise)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Details Tabs */}
        <Tabs defaultValue={preferredMethod} value={preferredMethod} onValueChange={setPreferredMethod}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="paypal" className="flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">PayPal</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Bank</span>
            </TabsTrigger>
            <TabsTrigger value="wise" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Wise</span>
            </TabsTrigger>
          </TabsList>

          {/* PayPal Tab */}
          <TabsContent value="paypal" className="space-y-4 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Wallet className="h-3 w-3 mr-1" />
                PayPal
              </Badge>
              {preferredMethod === "paypal" && paypalEmail && (
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Preferred
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypalEmail">PayPal Email</Label>
              <Input
                id="paypalEmail"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Enter the email associated with your PayPal account.
              </p>
            </div>
          </TabsContent>

          {/* Bank Transfer Tab */}
          <TabsContent value="bank" className="space-y-4 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Building2 className="h-3 w-3 mr-1" />
                Bank Transfer
              </Badge>
              {preferredMethod === "bank" && iban && (
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Preferred
                </Badge>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankAccountName">Account Holder Name</Label>
                <Input
                  id="bankAccountName"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Emirates NBD"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  placeholder="AE12 3456 7890 1234 5678 901"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="swiftBic">SWIFT/BIC Code</Label>
                <Input
                  id="swiftBic"
                  value={swiftBic}
                  onChange={(e) => setSwiftBic(e.target.value.toUpperCase())}
                  placeholder="EABORAEAXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankCurrency">Preferred Currency</Label>
                <Select value={bankCurrency} onValueChange={setBankCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bankAddress">Bank Address (Optional)</Label>
                <Input
                  id="bankAddress"
                  value={bankAddress}
                  onChange={(e) => setBankAddress(e.target.value)}
                  placeholder="Bank branch address"
                />
              </div>
            </div>
          </TabsContent>

          {/* Wise Tab */}
          <TabsContent value="wise" className="space-y-4 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CreditCard className="h-3 w-3 mr-1" />
                Wise
              </Badge>
              {preferredMethod === "wise" && wiseEmail && (
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Preferred
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiseEmail">Wise Email</Label>
              <Input
                id="wiseEmail"
                type="email"
                value={wiseEmail}
                onChange={(e) => setWiseEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Enter the email associated with your Wise account.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Message */}
        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Payment Details
        </Button>
      </CardContent>
    </Card>
  );
}

