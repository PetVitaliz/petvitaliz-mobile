import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  Alert,
  AppState,
} from 'react-native';

// Telas públicas
import SplashScreen from '../screens/public/SplashScreen';
import HomeScreen from '../screens/public/HomeScreen';
import PlansScreen from '../screens/public/PlansScreen';
import BenefitsScreen from '../screens/public/BenefitsScreen';
import ProfileScreen from '../screens/public/ProfileScreen';
import ServicesScreen from '../screens/public/ServicesScreen';
import HowItWorksScreen from '../screens/public/HowItWorksScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import EmailSentScreen from '../screens/auth/EmailSentScreen';
import VerifyCodeScreen from '../screens/auth/VerifyCodeScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import SupportScreen from '../screens/public/SupportScreen';
import FaqScreen from '../screens/public/FaqScreen';
import TermsScreen from '../screens/public/TermsScreen';
import PrivacyScreen from '../screens/public/PrivacyScreen';

// Telas privadas
import PrivateHomeScreen from '../screens/private/PrivateHomeScreen';
import PrivateProfileScreen from '../screens/private/PrivateProfileScreen';
import PrivateExploreScreen from '../screens/private/PrivateExploreScreen';
import PrivateServicesScreen from '../screens/private/PrivateServicesScreen';
import PrivatePlansScreen from '../screens/private/PrivatePlansScreen';
import PrivateMyPlanScreen from '../screens/private/PrivateMyPlanScreen';
import PrivateChangePlanScreen from '../screens/private/PrivateChangePlanScreen';
import { PLAN_NAMES, getCyclePrice, getPlanId, type ServiceId, type PlanId } from '../data/planCoverage';
import { applyProducts, loadPlanCatalog, usePlanCatalog } from '../data/planCatalog';
import PrivateManagePlanScreen from '../screens/private/PrivateManagePlanScreen';
import PrivateInvoicesScreen from '../screens/private/PrivateInvoicesScreen';
import PrivateBenefitsScreen from '../screens/private/PrivateBenefitsScreen';
import PrivatePersonalDataScreen from '../screens/private/PrivatePersonalDataScreen';
import PrivatePaymentMethodsScreen from '../screens/private/PrivatePaymentMethodsScreen';
import type { SavedCard } from '../screens/private/PrivatePaymentMethodsScreen';
import PrivatePetsFlowScreen from '../screens/private/PrivatePetsFlowScreen';
import type { Pet } from '../screens/private/PrivatePetsFlowScreen';
import PrivateConsultationsScreen from '../screens/private/PrivateConsultationsScreen';
import type { ConsultationAppointment } from '../screens/private/PrivateConsultationsScreen';
import PrivateNotificationsScreen from '../screens/private/PrivateNotificationsScreen';
import type { NotificationPrefs } from '../screens/private/PrivateNotificationsScreen';
import PrivateSecurityScreen from '../screens/private/PrivateSecurityScreen';
import PrivateHelpSupportScreen from '../screens/private/PrivateHelpSupportScreen';
import PrivateTermsScreen from '../screens/private/PrivateTermsScreen';
import LoadingOverlay from '../components/LoadingOverlay';
import type { RegisterData } from '../screens/auth/RegisterScreen';
import * as api from '../services/api';
import type { ApiProduct } from '../services/api';
import { ApiError } from '../services/http';
import {
  findProductForPlan,
  formatCpf,
  petImageOf,
  planIdForProduct,
  splitFullName,
  toAppointmentPayload,
  toIsoDate,
  toMobileAppointment,
  toMobilePet,
  toPetPayload,
} from '../services/mappers';
import { errorMessage, notify } from '../utils/notify';

// Rotas
type Screen =
  | 'Splash'
  | 'Home'
  | 'Plans'
  | 'Benefits'
  | 'Profile'
  | 'Services'
  | 'HowItWorks'
  | 'Login'
  | 'Register'
  | 'ForgotPassword'
  | 'EmailSent'
  | 'VerifyCode'
  | 'ResetPassword'
  | 'Support'
  | 'Faq'
  | 'Terms'
  | 'Privacy'
  | 'PrivateHome'
  | 'PrivateProfile'
  | 'PrivateExplore'
  | 'PrivateServices'
  | 'PrivatePlans'
  | 'PrivateMyPlan'
  | 'PrivateChangePlan'
  | 'PrivateManagePlan'
  | 'PrivateInvoices'
  | 'PrivateBenefits'
  | 'PrivatePersonalData'
  | 'PrivatePaymentMethods'
  | 'PrivatePetsFlow'
  | 'PrivateConsultations'
  | 'PrivateNotifications'
  | 'PrivateSecurity'
  | 'PrivateHelpSupport'
  | 'PrivateTerms'
  | 'PublicHelp'
  | 'PublicTerms';

// Dados da assinatura
type PlanSubscription = {
  petId: string;
  planId: string;
  planName: string;
  petName: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod: 'card' | 'pix' | 'boleto';
  totalPrice: number;
  installments: number;
  status: 'paid' | 'pending';
  cardLast4?: string;
  startedAt?: string;
  // Troca para um plano menor, agendada para a próxima renovação.
  scheduledChange?: {
    planId: string;
    planName: string;
    billingCycle: 'monthly' | 'yearly';
    effectiveDate: string;
  } | null;
};

// Dados das faturas
type Invoice = {
  id: string;
  description: string;
  dueDate: string;
  amount: number;
  status: 'Paga' | 'Pendente';
};

export default function AppNavigator() {
  usePlanCatalog();
  const [stack, setStack] = useState<Screen[]>(['Splash']);

  useEffect(() => {
    loadPlanCatalog();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadPlanCatalog();
      }
    });
    return () => subscription.remove();
  }, []);

  const [registeredEmails, setRegisteredEmails] = useState<string[]>([]);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // Dados do usuário
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userCpf, setUserCpf] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [busyMessage, setBusyMessage] = useState('');
  const [userBirthDate, setUserBirthDate] = useState('');

  // Preferências de notificação
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    consultas: true,
    vacinas: true,
    ofertas: false,
  });

  // Cartões salvos (só os 4 últimos números)
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);

  // Lista compartilhada de pets
  const [userPets, setUserPets] = useState<Pet[]>([]);

  // Dados da contratação
  const [planSubscription, setPlanSubscription] =
    useState<PlanSubscription | null>(null);

  // Faturas
  const [invoices] = useState<Invoice[]>([]);

  // Pet escolhido ao abrir Contratar Plano a partir de Meus Pets
  const [contractPetId, setContractPetId] = useState<string | null>(null);
  // Plano escolhido ao tocar num banner
  const [contractPlanId, setContractPlanId] = useState<string | null>(null);

  // Agendamento aberto a partir de Serviços ou Meu Plano
  const [bookingIntent, setBookingIntent] = useState<{
    petId: string;
    serviceId?: ServiceId;
  } | null>(null);

  const openConsultations = (intent: { petId: string; serviceId?: ServiceId } | null = null) => {
    setBookingIntent(intent);
    push('PrivateConsultations');
  };

  // Pet escolhido para a tela Mudar de plano
  const [changePlanPetId, setChangePlanPetId] = useState<string | null>(null);
  const [changePlanPreset, setChangePlanPreset] = useState<{
    planId: PlanId;
    cycle: 'monthly' | 'yearly';
  } | null>(null);

  const openChangePlan = (
    petId: string,
    preset: { planId: PlanId; cycle: 'monthly' | 'yearly' } | null = null,
  ) => {
    setChangePlanPetId(petId);
    setChangePlanPreset(preset);
    push('PrivateChangePlan');
  };

  // Consultas agendadas (compartilhadas entre as telas)
  const [appointments, setAppointments] = useState<ConsultationAppointment[]>([]);

  const currentScreen = stack[stack.length - 1];

  // Navegação
  const push = useCallback((screen: Screen) => {
    setStack((prev) => [...prev, screen]);
  }, []);

  const reset = useCallback((screen: Screen) => {
    setStack([screen]);
  }, []);

  const back = useCallback(() => {
    setStack((prev) =>
      prev.length > 1 ? prev.slice(0, -1) : prev,
    );
  }, []);

  // Volta para a tela anterior. Se não houver (aberta pela barra inferior),
  // volta para o Início da área logada.
  const backOrHome = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : ['PrivateHome']));
  }, []);

  // Plano escolhido sem login (regra A2): depois do login, abre o checkout dele.
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  // Plano aberto na vitrine pública (vindo da Home)
  const [publicPlanId, setPublicPlanId] = useState<PlanId | undefined>(undefined);

  const choosePlanPublic = (planId: string) => {
    setPendingPlanId(planId);
    setStack((prev) => [...prev, 'Login']);
  };

  // Depois de entrar ou criar conta.
  const afterAuth = () => {
    if (pendingPlanId) {
      setContractPetId(null);
      setContractPlanId(pendingPlanId);
      setPendingPlanId(null);
      setStack(['PrivateHome', 'PrivatePlans']);
    } else {
      setStack(['PrivateHome']);
    }
  };

  const goTo = useCallback((target: 'Login' | 'Register') => {
    setStack((prev) => {
      const index = prev.lastIndexOf(target);

      if (index >= 0) {
        return prev.slice(0, index + 1);
      }

      return [...prev.slice(0, -1), target];
    });
  }, []);

  // Botão voltar do Android
  useEffect(() => {
    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (stack.length > 1) {
          back();
          return true;
        }

        return false;
      },
    );

    return () => sub.remove();
  }, [stack, back]);

  const petsRef = useRef<Pet[]>(userPets);
  petsRef.current = userPets;
  const appointmentsRef = useRef<ConsultationAppointment[]>(appointments);
  appointmentsRef.current = appointments;
  const subscriptionRef = useRef<PlanSubscription | null>(planSubscription);
  subscriptionRef.current = planSubscription;
  const productsRef = useRef<ApiProduct[]>([]);

  const clearAccountData = useCallback(() => {
    setUserPets([]);
    setAppointments([]);
    setPlanSubscription(null);
    setSavedCards([]);
    setProfileImage(null);
    setUserName('');
    setUserEmail('');
    setUserPhone('');
    setUserCpf('');
    setUserBirthDate('');
  }, []);

  const loadAccountData = useCallback(async () => {
    const today = new Date();
    const [profile, apiPets, apiAppointments, products, petPlans] = await Promise.all([
      api.getProfile(),
      api.listPets(),
      api.listAppointments(),
      api.listProducts(),
      api.listPetPlans(),
    ]);
    productsRef.current = products;
    applyProducts(products);

    setUserName(`${profile.nome} ${profile.sobrenome}`.trim());
    setUserEmail(profile.email);
    setUserCpf(formatCpf(profile.CPF));
    setUserPhone(formatPhone(profile.telefone ?? ''));
    setUserBirthDate(formatBirthDate(profile.data_nascimento ?? ''));

    const previousPets = petsRef.current;
    let pets: Pet[] = apiPets.map((apiPet) => {
      const previous =
        previousPets.find((pet) => pet.id === String(apiPet.id_pet)) ??
        previousPets.find((pet) => !/^\d{1,9}$/.test(pet.id) && pet.name === apiPet.nome);
      return { ...toMobilePet(apiPet, today, previous), plan: null, hasActivePlan: false };
    });

    const planNameOf = (product: ApiProduct) => {
      const planId = planIdForProduct(product, products);
      return planId ? PLAN_NAMES[planId] : product.nome.split('|')[0].trim();
    };
    pets = pets.map((pet) => {
      const petPlan = petPlans.find((item) => String(item.id_pet) === pet.id);
      return petPlan ? { ...pet, plan: planNameOf(petPlan.produto), hasActivePlan: true } : pet;
    });

    let subscription: PlanSubscription | null = null;
    const previous = subscriptionRef.current;
    const current =
      petPlans.find((item) => String(item.id_pet) === previous?.petId) ?? petPlans[0];
    const owner = current ? pets.find((pet) => pet.id === String(current.id_pet)) : undefined;
    if (current && owner) {
      const planId = planIdForProduct(current.produto, products) ?? 'bronze';
      const kept = previous && previous.petId === owner.id ? previous : null;
      subscription = {
        petId: owner.id,
        planId,
        planName: planNameOf(current.produto),
        petName: owner.name,
        billingCycle: kept?.billingCycle ?? 'monthly',
        paymentMethod: kept?.paymentMethod ?? 'card',
        totalPrice: kept && kept.planId === planId ? kept.totalPrice : Number(current.produto.preco),
        installments: kept?.installments ?? 1,
        status: 'paid',
        cardLast4: kept?.cardLast4,
        startedAt: kept?.startedAt ?? new Date().toISOString(),
        scheduledChange: null,
      };
    }

    const cancelled = appointmentsRef.current.filter((item) => item.status === 'cancelled');
    setUserPets(pets);
    setPlanSubscription(subscription);
    setAppointments([...apiAppointments.map((item) => toMobileAppointment(item, pets)), ...cancelled]);
  }, []);

  const runWithServer = useCallback(
    async (message: string, failureTitle: string, action: () => Promise<void>) => {
      setBusyMessage(message);
      try {
        await action();
        await loadAccountData();
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) {
          api.logout().catch(() => undefined);
          clearAccountData();
          setStack(['Home', 'Login']);
          notify('Sessão expirada', 'Entre novamente para continuar.');
          return;
        }
        notify(failureTitle, errorMessage(error, 'Tente novamente em instantes.'));
        await loadAccountData().catch(() => undefined);
      } finally {
        setBusyMessage('');
      }
    },
    [clearAccountData, loadAccountData],
  );

  const signIn = async (email: string, password: string) => {
    await api.login(email, password);
    await loadAccountData();
    afterAuth();
  };

  const signUp = async (data: RegisterData) => {
    const { firstName, lastName } = splitFullName(data.fullName);
    await api.signUp({
      nome: firstName,
      sobrenome: lastName,
      email: data.email,
      senha: data.password,
      CPF: data.cpf,
      telefone: data.phone,
      genero: 'O',
      data_nascimento: toIsoDate(data.birthDate),
    });
    await signIn(data.email, data.password);
  };

  const signOut = () => {
    api.logout().catch(() => undefined);
    clearAccountData();
    reset('Home');
  };

  const changePets: React.Dispatch<React.SetStateAction<Pet[]>> = (action) => {
    const previous = petsRef.current;
    const next = typeof action === 'function' ? action(previous) : action;
    setUserPets(next);

    const today = new Date();
    const created = next.filter((pet) => !previous.some((item) => item.id === pet.id));
    const removed = previous.filter((pet) => !next.some((item) => item.id === pet.id));
    const updated = next.filter((pet) => {
      const original = previous.find((item) => item.id === pet.id);
      return !!original && original !== pet;
    });
    if (created.length + removed.length + updated.length === 0) {
      return;
    }

    void runWithServer('Salvando dados do pet...', 'Não foi possível salvar o pet', async () => {
      for (const pet of created) {
        await api.createPet(toPetPayload(pet, today), petImageOf(pet));
      }
      for (const pet of updated) {
        const original = previous.find((item) => item.id === pet.id);
        await api.updatePet(Number(pet.id), toPetPayload(pet, today, original), petImageOf(pet));
      }
      for (const pet of removed) {
        await api.deletePet(Number(pet.id));
      }
    });
  };

  const changeAppointments: React.Dispatch<React.SetStateAction<ConsultationAppointment[]>> = (action) => {
    const previous = appointmentsRef.current;
    const next = typeof action === 'function' ? action(previous) : action;
    setAppointments(next);

    const created = next.filter((item) => !previous.some((old) => old.id === item.id));
    const cancelled = next.filter((item) => {
      const original = previous.find((old) => old.id === item.id);
      return !!original && original.status === 'scheduled' && item.status === 'cancelled';
    });
    const rescheduled = next.filter((item) => {
      const original = previous.find((old) => old.id === item.id);
      return (
        !!original &&
        item.status === 'scheduled' &&
        (original.date !== item.date || original.time !== item.time)
      );
    });
    if (created.length + cancelled.length + rescheduled.length === 0) {
      return;
    }

    void runWithServer('Atualizando agendamento...', 'Não foi possível concluir o agendamento', async () => {
      for (const item of [...created, ...rescheduled]) {
        await api.scheduleAppointment(toAppointmentPayload(item.petId, item.serviceId, item.date, item.time));
      }
      for (const item of [...cancelled, ...rescheduled]) {
        await api.cancelAppointment(Number(item.id));
      }
    });
  };

  const subscribeToPlan = (planId: PlanId, petId: string) => {
    void runWithServer('Ativando o plano...', 'Não foi possível ativar o plano', async () => {
      const product = findProductForPlan(productsRef.current, planId);
      if (!product || product.id_produto === undefined) {
        throw new Error(`O ${PLAN_NAMES[planId]} ainda não está cadastrado no servidor.`);
      }
      const plans = await api.listPetPlans();
      if (plans.some((item) => String(item.id_pet) === petId)) {
        await api.cancelPlan(Number(petId));
      }
      await api.subscribe(product.id_produto, Number(petId));
    });
  };

  const cancelSubscription = (petId?: string) => {
    const targetPetId = petId ?? subscriptionRef.current?.petId ?? planSubscription?.petId;
    if (!targetPetId) {
      return;
    }
    Alert.alert('Cancelar plano', 'Tem certeza de que deseja cancelar o plano?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar plano',
        style: 'destructive',
        onPress: () => {
          void runWithServer('Cancelando o plano...', 'Não foi possível cancelar o plano', async () => {
            await api.cancelPlan(Number(targetPetId));
            if (subscriptionRef.current?.petId === targetPetId) {
              subscriptionRef.current = null;
            }
          });
        },
      },
    ]);
  };

  // Navegação pública
  const tabs = {
    onNavigateToHome: () => reset('Home'),
    onNavigateToPlans: () => {
      setPublicPlanId(undefined);
      reset('Plans');
    },
    onNavigateToBenefits: () => reset('Benefits'),
    onNavigateToProfile: () => reset('Profile'),
  };

  // Navegação privada
  const privateTabs = {
    onNavigateToHome: () => reset('PrivateHome'),
    onNavigateToExplore: () => reset('PrivateExplore'),

    onNavigateToPlans: () => {
      setContractPetId(null);
      setContractPlanId(null);
      reset(planSubscription ? 'PrivateMyPlan' : 'PrivatePlans');
    },

    onNavigateToMyPlan: () => reset('PrivateMyPlan'),
    onNavigateToBenefits: () => reset('PrivateBenefits'),
    onNavigateToProfile: () => reset('PrivateProfile'),
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Splash':
        return (
          <SplashScreen
            onFinish={() => reset('Home')}
          />
        );

      // Telas públicas
      case 'Home':
        return (
          <HomeScreen
            {...tabs}
            onNavigateToLogin={() => push('Login')}
            onNavigateToRegister={() => push('Register')}
            onNavigateToServices={() => reset('Plans')}
            onNavigateToSupport={() => push('PublicHelp')}
            onChoosePlan={choosePlanPublic}
            onOpenPlans={(planId) => {
              setPublicPlanId(planId);
              push('Plans');
            }}
          />
        );

      case 'Plans':
        return (
          <PlansScreen
            {...tabs}
            onNavigateToLogin={() => push('Login')}
            onChoosePlan={choosePlanPublic}
            initialPlanId={publicPlanId}
            onBack={() => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : ['Home']))}
          />
        );

      case 'Benefits':
        return (
          <BenefitsScreen
            {...tabs}
            onNavigateToLogin={() => push('Login')}
            onNavigateToRegister={() => push('Register')}
            onChoosePlan={choosePlanPublic}
            onBack={() => reset('Home')}
          />
        );

      case 'Profile':
        return (
          <ProfileScreen
            {...tabs}
            onNavigateToLogin={() => push('Login')}
            onNavigateToRegister={() => push('Register')}
            onNavigateToSupport={() => push('PublicHelp')}
            onNavigateToTerms={() => push('PublicTerms')}
            onBack={() => reset('Home')}
          />
        );

      // Páginas públicas
      case 'Services':
        return (
          <ServicesScreen
            onBack={back}
            onNavigateToPlans={() => reset('Plans')}
            onNavigateToLogin={() => push('Login')}
          />
        );

      case 'HowItWorks':
        return (
          <HowItWorksScreen
            onBack={back}
            onNavigateToServices={() => push('Services')}
            onNavigateToLogin={() => push('Login')}
            onNavigateToRegister={() => push('Register')}
          />
        );

      case 'Support':
        return <SupportScreen {...tabs} onBack={back} />;

      case 'Faq':
        return <FaqScreen {...tabs} onBack={back} />;

      case 'Terms':
        return <TermsScreen {...tabs} onBack={back} />;

      case 'Privacy':
        return <PrivacyScreen {...tabs} onBack={back} />;

      // Autenticação
      case 'Login':
        return (
          <LoginScreen
            onBack={back}
            onLoginSuccess={afterAuth}
            onSubmit={signIn}
            onNavigateToRegister={() => goTo('Register')}
            onNavigateToForgotPassword={() => push('ForgotPassword')}
            onNavigateToTerms={() => push('Terms')}
            onNavigateToPrivacy={() => push('Privacy')}
          />
        );

      case 'Register':
        return (
          <RegisterScreen
            onBack={back}
            registeredEmails={registeredEmails}
            onRegisterUser={(email) =>
              setRegisteredEmails((prev) => [...prev, email])
            }
            onNavigateToLogin={() => goTo('Login')}
            onRegisterSuccess={afterAuth}
            onSubmit={signUp}
            onNavigateToTerms={() => push('PublicTerms')}
            onNavigateToPrivacy={() => push('Privacy')}
          />
        );

      // Recuperação de senha
      case 'ForgotPassword':
        return (
          <ForgotPasswordScreen
            onBack={back}
            registeredEmails={registeredEmails}
            onNavigateToLogin={() => goTo('Login')}
            onRequestCode={async (email) => {
              await api.requestPasswordReset(email);
            }}
            onCodeSent={(email) => {
              setRecoveryEmail(email);
              push('EmailSent');
            }}
          />
        );

      case 'EmailSent':
        return (
          <EmailSentScreen
            email={recoveryEmail}
            onBack={back}
            onNavigateToVerifyCode={() => push('VerifyCode')}
          />
        );

      case 'VerifyCode':
        return (
          <VerifyCodeScreen
            onBack={back}
            onVerifyCode={async (code) => {
              setResetToken(await api.confirmResetCode(recoveryEmail, code));
            }}
            onNavigateToResetPassword={() => push('ResetPassword')}
          />
        );

      case 'ResetPassword':
        return (
          <ResetPasswordScreen
            onBack={back}
            onSubmitPassword={async (password) => {
              await api.changePassword(resetToken, password);
              setResetToken('');
            }}
            onNavigateToLogin={() => goTo('Login')}
          />
        );

      // Área privada
      case 'PrivateHome':
        return (
          <PrivateHomeScreen
            {...privateTabs}
            onNavigateToServices={() => push('PrivateServices')}
            onNavigateToSupport={() => push('PrivateHelpSupport')}
            onNavigateToPets={() => push('PrivatePetsFlow')}
            onNavigateToConsultations={() => openConsultations()}
            onNavigateToPersonalData={() => push('PrivatePersonalData')}
            onNavigateToPaymentMethods={() => push('PrivatePaymentMethods')}
            onNavigateToNotifications={() => push('PrivateNotifications')}
            onNavigateToSecurity={() => push('PrivateSecurity')}
            onLogout={signOut}
            profileImage={profileImage}
            userName={userName}
            userEmail={userEmail}
            pets={userPets}
            subscription={planSubscription}
            appointments={appointments}
            onOpenPlan={(planId) => {
              setContractPetId(null);
              setContractPlanId(planId);
              push('PrivatePlans');
            }}
            upcomingCount={appointments.filter((item) => item.status === 'scheduled' && item.date >= new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)).length}
            onNavigateToTerms={() => push('PrivateTerms')}
            onNavigateToMyPlan={() => reset('PrivateMyPlan')}
            onContractPlan={(petId) => {
              setContractPetId(petId);
              setContractPlanId(null);
              push('PrivatePlans');
            }}
          />
        );

      case 'PrivateProfile':
        return (
          <PrivateProfileScreen
            {...privateTabs}
            profileImage={profileImage}
            userName={userName}
            userEmail={userEmail}
            onNavigateToPersonalData={() => push('PrivatePersonalData')}
            onNavigateToPaymentMethods={() => push('PrivatePaymentMethods')}
            onNavigateToPets={() => push('PrivatePetsFlow')}
            onNavigateToConsultations={() => openConsultations()}
            onNavigateToNotifications={() => push('PrivateNotifications')}
            onNavigateToSecurity={() => push('PrivateSecurity')}
            onNavigateToHelp={() => push('PrivateHelpSupport')}
            onNavigateToMyPlan={() => reset('PrivateMyPlan')}
            onNavigateToTerms={() => push('PrivateTerms')}
            onBack={backOrHome}
            petsCount={userPets.length}
            activePlans={userPets.filter((pet) => pet.hasActivePlan).length}
            upcomingCount={appointments.filter((item) => item.status === 'scheduled' && item.date >= new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)).length}
            onLogout={signOut}
          />
        );

      case 'PrivateExplore':
        return (
          <PrivateExploreScreen {...privateTabs} />
        );

      case 'PrivateServices':
        return (
          <PrivateServicesScreen
            {...privateTabs}
            onBack={back}
            pets={userPets}
            onNavigateToAddPet={() => push('PrivatePetsFlow')}
            onSelectService={(petId, serviceId) => openConsultations({ petId, serviceId })}
          />
        );

      // Contratação de planos
      case 'PrivatePlans':
        return (
          <PrivatePlansScreen
            {...privateTabs}
            onBack={backOrHome}
            pets={userPets}
            initialPetId={contractPetId}
            initialPlanId={contractPlanId}
            onPurchaseComplete={(subscription) => {
              setPlanSubscription({
                ...subscription,
                startedAt: new Date().toISOString(),
              });

              if (subscription.status === 'paid') {
                subscriptionRef.current = { ...subscription, startedAt: new Date().toISOString() };
                subscribeToPlan(subscription.planId as PlanId, subscription.petId);
                setUserPets((previousPets) =>
                  previousPets.map((pet) =>
                    pet.id === subscription.petId
                      ? {
                          ...pet,
                          plan: subscription.planName,
                          hasActivePlan: true,
                        }
                      : pet,
                  ),
                );
              }
            }}
            onNavigateToAddPet={() => push('PrivatePetsFlow')}
            onNavigateToMyPlan={() => reset('PrivateMyPlan')}
          />
        );

      // Meu Plano
      case 'PrivateMyPlan':
        return (
          <PrivateMyPlanScreen
            {...privateTabs}
            onBack={backOrHome}
            onNavigateToPlans={() => reset('PrivatePlans')}
            onNavigateToManagePlan={() => push('PrivateManagePlan')}
            onNavigateToPaymentMethods={() => push('PrivatePaymentMethods')}
            onNavigateToInvoices={() => push('PrivateInvoices')}
            onNavigateToPets={() => push('PrivatePetsFlow')}
            onNavigateToSchedule={(petId) => openConsultations({ petId })}
            onNavigateToChangePlan={(petId) => openChangePlan(petId)}
            onCancelSubscription={cancelSubscription}
            subscription={planSubscription}
            invoices={invoices}
            appointments={appointments}
            pets={userPets}
          />
        );

      // Mudar de plano
      case 'PrivateChangePlan': {
        const pet = userPets.find((item) => item.id === changePlanPetId);
        if (!pet) return null;

        const details =
          planSubscription &&
          planSubscription.petName.trim().toLowerCase() === pet.name.trim().toLowerCase()
            ? planSubscription
            : null;

        return (
          <PrivateChangePlanScreen
            pet={pet}
            currentCycle={details?.billingCycle}
            paymentMethod={details?.paymentMethod}
            startedAt={details?.startedAt}
            initialPlanId={changePlanPreset?.planId}
            initialCycle={changePlanPreset?.cycle}
            onBack={back}
            onNavigateToPaymentMethods={() => push('PrivatePaymentMethods')}
            onConfirm={(result) => {
              const planName = PLAN_NAMES[result.planId];
              const base: PlanSubscription = details ?? {
                petId: pet.id,
                planId: getPlanId(pet.plan) ?? result.planId,
                planName: pet.plan ?? planName,
                petName: pet.name,
                billingCycle: 'monthly',
                paymentMethod: 'card',
                totalPrice: getCyclePrice(getPlanId(pet.plan) ?? result.planId, 'monthly'),
                installments: 1,
                status: 'paid',
                startedAt: new Date().toISOString(),
              };

              if (result.appliesNow) {
                // Upgrade: vale hoje.
                subscribeToPlan(result.planId, pet.id);
                setUserPets((previous) =>
                  previous.map((item) =>
                    item.id === pet.id ? { ...item, plan: planName, hasActivePlan: true } : item,
                  ),
                );
                setPlanSubscription({
                  ...base,
                  planId: result.planId,
                  planName,
                  billingCycle: result.billingCycle,
                  totalPrice: getCyclePrice(result.planId, result.billingCycle),
                  installments: 1,
                  startedAt:
                    result.billingCycle !== base.billingCycle
                      ? new Date().toISOString()
                      : base.startedAt,
                  scheduledChange: null,
                });
                back();
                Alert.alert('Plano alterado', `${pet.name} agora tem o ${planName}.`);
              } else {
                // Plano menor ou troca de ciclo: vale na próxima renovação.
                setPlanSubscription({
                  ...base,
                  scheduledChange: {
                    planId: result.planId,
                    planName,
                    billingCycle: result.billingCycle,
                    effectiveDate: result.effectiveDate,
                  },
                });
                back();
                Alert.alert(
                  'Mudança agendada',
                  `${pet.name} passa para o ${planName} em ${new Date(result.effectiveDate).toLocaleDateString('pt-BR')}.`,
                );
              }
            }}
          />
        );
      }

      // Gerenciar Plano
      case 'PrivateManagePlan':
        return (
          <PrivateManagePlanScreen
            {...privateTabs}
            onBack={back}
            onNavigateToPaymentMethods={() => push('PrivatePaymentMethods')}
            onNavigateToChangePlan={(petId, preset) => openChangePlan(petId, preset ?? null)}
            subscription={planSubscription}
            pets={userPets}
            onCancelSubscription={cancelSubscription}
          />
        );

      // Faturas
      case 'PrivateInvoices':
        return (
          <PrivateInvoicesScreen
            {...privateTabs}
            onBack={back}
            invoices={invoices}
            onPayInvoice={(invoice) => {
              Alert.alert(
                'Pagamento de fatura',
                `Fatura: ${invoice.description}\nValor: ${invoice.amount.toLocaleString(
                  'pt-BR',
                  {
                    style: 'currency',
                    currency: 'BRL',
                  },
                )}\n\nO pagamento desta fatura ainda precisa ser conectado ao checkout.`,
              );
            }}
          />
        );

      case 'PrivateBenefits':
        return (
          <PrivateBenefitsScreen
            {...privateTabs}
            onBack={backOrHome}
            pets={userPets}
            appointments={appointments}
            onNavigateToAddPet={() => push('PrivatePetsFlow')}
            onSchedule={(petId) => openConsultations({ petId })}
            onContractPlan={(petId, planId) => {
              setContractPetId(petId);
              setContractPlanId(planId);
              push('PrivatePlans');
            }}
            onChangePlan={(petId, planId) => {
              const cycle =
                planSubscription && planSubscription.petId === petId
                  ? planSubscription.billingCycle
                  : 'monthly';
              openChangePlan(petId, { planId, cycle });
            }}
          />
        );

      // Subtelas do perfil privado
      case 'PrivatePersonalData':
        return (
          <PrivatePersonalDataScreen
            {...privateTabs}
            onBack={back}
            profileImage={profileImage}
            setProfileImage={setProfileImage}
            userName={userName}
            setUserName={setUserName}
            userEmail={userEmail}
            setUserEmail={setUserEmail}
            userPhone={userPhone}
            setUserPhone={setUserPhone}
            userCpf={userCpf}
            setUserCpf={setUserCpf}
            userBirthDate={userBirthDate}
            setUserBirthDate={setUserBirthDate}
          />
        );

      case 'PrivatePaymentMethods':
        return (
          <PrivatePaymentMethodsScreen
            {...privateTabs}
            onBack={back}
            cards={savedCards}
            onCardsChange={setSavedCards}
            hasActivePlan={userPets.some((pet) => pet.hasActivePlan)}
          />
        );

      case 'PrivatePetsFlow':
        return (
          <PrivatePetsFlowScreen
            {...privateTabs}
            onBack={back}
            pets={userPets}
            onPetsChange={changePets}
            onContractPlan={(petId) => {
              setContractPetId(petId);
              setContractPlanId(null);
              push('PrivatePlans');
            }}
          />
        );

      case 'PrivateConsultations':
        return (
          <PrivateConsultationsScreen
            {...privateTabs}
            onBack={back}
            pets={userPets}
            appointments={appointments}
            onAppointmentsChange={changeAppointments}
            initialPetId={bookingIntent?.petId}
            initialServiceId={bookingIntent?.serviceId}
            openServiceChoice={!!bookingIntent && !bookingIntent.serviceId}
            onContractPlan={(petId) => {
              setContractPetId(petId);
              setContractPlanId(null);
              push('PrivatePlans');
            }}
          />
        );

      case 'PrivateNotifications':
        return (
          <PrivateNotificationsScreen
            {...privateTabs}
            onBack={back}
            pets={userPets}
            appointments={appointments}
            subscription={planSubscription}
            prefs={notificationPrefs}
            onPrefsChange={setNotificationPrefs}
            onOpenConsultations={() => openConsultations()}
            onOpenMyPlan={() => reset('PrivateMyPlan')}
          />
        );

      case 'PrivateSecurity':
        return (
          <PrivateSecurityScreen
            {...privateTabs}
            onBack={back}
            onDeleteAccount={() => {
              signOut();
              Alert.alert(
                'Sessão encerrada',
                'A exclusão definitiva da conta ainda não está disponível no servidor. Fale com o suporte para concluir.',
              );
            }}
          />
        );

      case 'PrivateHelpSupport':
        return (
          <PrivateHelpSupportScreen
            {...privateTabs}
            onBack={back}
            onNavigateToTerms={() => push('PrivateTerms')}
          />
        );

      // Termos abertos de dentro da conta (sem a barra pública)
      case 'PrivateTerms':
        return (
          <PrivateTermsScreen
            {...privateTabs}
            onBack={backOrHome}
            onNavigateToHelp={() => push('PrivateHelpSupport')}
          />
        );

      // Ajuda e Termos abertos sem login (com a barra pública)
      case 'PublicHelp':
        return (
          <PrivateHelpSupportScreen
            {...tabs}
            onBack={back}
            onNavigateToTerms={() => push('PublicTerms')}
          />
        );

      case 'PublicTerms':
        return (
          <PrivateTermsScreen
            {...tabs}
            onBack={back}
            onNavigateToHelp={() => push('PublicHelp')}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      <LoadingOverlay visible={!!busyMessage} message={busyMessage} />
    </View>
  );
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11 ? digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : phone;
}

function formatBirthDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});