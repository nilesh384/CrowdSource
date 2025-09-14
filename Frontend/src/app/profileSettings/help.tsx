import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  expanded: boolean;
}

export default function HelpSupport() {
  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      id: '1',
      question: 'How do I report a civic issue?',
      answer: 'Tap the "+" button on the home screen, fill in the details about the issue, add photos if available, and submit. Your report will be sent to the relevant authorities.',
      expanded: false,
    },
    {
      id: '2',
      question: 'How can I track my complaint status?',
      answer: 'Go to the "My Complaints" tab in the Complaints section. You can view all your submitted complaints and their current status.',
      expanded: false,
    },
    {
      id: '3',
      question: 'What types of issues can I report?',
      answer: 'You can report various civic issues including potholes, street light problems, garbage collection, water supply issues, and other public infrastructure problems.',
      expanded: false,
    },
    {
      id: '4',
      question: 'How do I update my profile information?',
      answer: 'Go to Profile > Settings > Personal Information to update your details, or tap on your profile picture to change it.',
      expanded: false,
    },
    {
      id: '5',
      question: 'Is my data secure?',
      answer: 'Yes, we use industry-standard encryption and security measures to protect your personal information and complaint data.',
      expanded: false,
    },
  ]);

  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
  });

  const toggleFAQ = (id: string) => {
    setFaqs(prev =>
      prev.map(faq =>
        faq.id === id
          ? { ...faq, expanded: !faq.expanded }
          : faq
      )
    );
  };

  const handleContactSubmit = () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    Alert.alert(
      'Message Sent',
      'Thank you for contacting us. We will respond to your message within 24 hours.',
      [
        {
          text: 'OK',
          onPress: () => {
            setContactForm({ subject: '', message: '' });
          }
        }
      ]
    );
  };

  const handleCallSupport = () => {
    const phoneNumber = '+911234567890'; // Replace with actual support number
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmailSupport = () => {
    const email = 'support@civicreporter.com'; // Replace with actual support email
    Linking.openURL(`mailto:${email}`);
  };

  const quickActions = [
    {
      id: 'call',
      title: 'Call Support',
      subtitle: '',
      icon: 'call',
      action: handleCallSupport,
    },
    {
      id: 'email',
      title: 'Email Support',
      subtitle: '',
      icon: 'mail',
      action: handleEmailSupport,
    },
    {
      id: 'chat',
      title: 'Chat',
      subtitle: '',
      icon: 'chatbubble',
      action: () => Alert.alert('Coming Soon', 'Live chat will be available soon!'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Find answers to common questions or get in touch with our support team
        </Text>

        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionButton}
              onPress={action.action}
              activeOpacity={0.8}
            >
              <Ionicons name={action.icon as any} size={24} color="#FF6B35" />
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {faqs.map((faq) => (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(faq.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Ionicons
                  name={faq.expanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666666"
                />
              </TouchableOpacity>

              {faq.expanded && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.contactDescription}>
            Can't find what you're looking for? Send us a message and we'll get back to you.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              value={contactForm.subject}
              onChangeText={(value) => setContactForm(prev => ({ ...prev, subject: value }))}
              placeholder="What can we help you with?"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={contactForm.message}
              onChangeText={(value) => setContactForm(prev => ({ ...prev, message: value }))}
              placeholder="Describe your issue or question..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleContactSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Support Hours</Text>
          <Text style={styles.infoText}>
            Monday - Friday: 9:00 AM - 6:00 PM IST
          </Text>
          <Text style={styles.infoText}>
            Saturday: 10:00 AM - 4:00 PM IST
          </Text>
          <Text style={styles.infoText}>
            Sunday: Closed
          </Text>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 8,
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  contactDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
    marginRight: 16,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    lineHeight: 18,
  },
});
